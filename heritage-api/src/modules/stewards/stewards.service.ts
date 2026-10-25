import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthTokenPurpose, Prisma, type Role } from '../../generated/prisma/client.js';
import { AuditService } from '../../platform/audit/audit.module.js';
import { AppConfig } from '../../platform/config/config.module.js';
import { normalizeEmail } from '../../platform/crypto/tokens.js';
import { PrismaService } from '../../platform/database/prisma.module.js';
import { EmailService } from '../../platform/email/email.module.js';
import { stewardInvitationEmail } from '../../platform/email/templates.js';
import { ApiError } from '../../platform/http/errors.js';
import { can, ROLE_LABELS, TEAM_SCOPED_ROLES, type Capability } from '../access/capabilities.js';
import type { AuthContext } from '../identity/auth.guard.js';
import { AuthService } from '../identity/auth.service.js';
import { SessionService } from '../identity/session.service.js';

const HOUR = 60 * 60 * 1000;

export interface InviteInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: Role;
  team_id?: string | null;
}

const notFound = () => new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Steward not found.');
const forbidden = (msg = 'You do not have permission to do this.') =>
  new ApiError(HttpStatus.FORBIDDEN, 'FORBIDDEN', msg);

/**
 * Steward lifecycle: admins and team leads appoint stewards, the system emails a
 * single-use claim link (Resend), and the steward activates their own account.
 * Appointment is explicit and audited — never inferred from a link (master-architecture §5).
 */
@Injectable()
export class StewardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
  ) {}

  async list(actor: AuthContext) {
    const churchWide = actor.grants.some((g) => g.capability === 'stewards.read' && g.scope === 'CHURCH');
    const teamIds = actor.grants
      .filter((g) => g.capability === 'stewards.read' && g.scope === 'TEAM' && g.teamId)
      .map((g) => g.teamId!);

    const people = await this.prisma.person.findMany({
      where: {
        account: { isNot: null },
        assignments: {
          some: { endedAt: null, ...(churchWide ? {} : { teamId: { in: teamIds } }) },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        account: { select: { loginEmail: true, status: true, lastLoginAt: true } },
        assignments: {
          where: { endedAt: null },
          select: { id: true, role: true, team: { select: { id: true, name: true } } },
        },
      },
    });

    return people.map((p) => ({
      person_id: p.id,
      first_name: p.firstName,
      last_name: p.lastName,
      phone: p.phone,
      email: p.account!.loginEmail,
      status: p.account!.status,
      last_login_at: p.account!.lastLoginAt?.toISOString() ?? null,
      assignments: p.assignments.map((a) => ({
        id: a.id,
        role: a.role,
        role_label: ROLE_LABELS[a.role],
        team: a.team,
      })),
    }));
  }

  async invite(actor: AuthContext, input: InviteInput) {
    const teamId = input.team_id ?? null;
    this.assertCanAppoint(actor, input.role, teamId);

    if (teamId) {
      const team = await this.prisma.team.findUnique({ where: { id: teamId } });
      if (!team) throw new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, 'TEAM_NOT_FOUND', 'Team not found.', { team_id: 'Unknown team' });
    }

    const loginEmail = normalizeEmail(input.email);
    const existing = await this.prisma.account.findUnique({ where: { loginEmail } });
    if (existing) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'EMAIL_IN_USE',
        'An account with this email already exists. Add an appointment to that person instead.',
        { email: 'Already registered' },
      );
    }

    let personId: string;
    try {
      personId = await this.prisma.$transaction(async (tx) => {
        const person = await tx.person.create({
          data: {
            firstName: input.first_name.trim(),
            lastName: input.last_name.trim(),
            email: loginEmail,
            phone: input.phone?.trim() || null,
            membershipStatus: 'WORK_FORCE',
            isVerified: true,
            verifiedAt: new Date(),
            verifiedById: actor.personId,
          },
        });
        await tx.account.create({ data: { personId: person.id, loginEmail, status: 'PENDING' } });
        await tx.assignment.create({
          data: { personId: person.id, role: input.role, teamId, createdById: actor.personId },
        });
        await this.audit.record(
          { action: 'stewards.invited', actorId: actor.personId, subjectId: person.id, metadata: { role: input.role, teamId } },
          tx,
        );
        return person.id;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ApiError(HttpStatus.CONFLICT, 'EMAIL_IN_USE', 'An account with this email already exists.');
      }
      throw err;
    }

    const delivery = await this.sendClaimEmail(personId, actor.personId);
    return { person_id: personId, invitation: delivery };
  }

  async resendInvitation(actor: AuthContext, personId: string) {
    const account = await this.loadManagedAccount(actor, personId, 'stewards.invite');
    if (account.status !== 'PENDING') {
      throw new ApiError(HttpStatus.CONFLICT, 'ALREADY_ACTIVE', 'This steward has already activated their account.');
    }
    return { invitation: await this.sendClaimEmail(personId, actor.personId) };
  }

  async setSuspended(actor: AuthContext, personId: string, suspended: boolean) {
    if (personId === actor.personId) throw forbidden('You cannot change your own account status.');
    const account = await this.loadManagedAccount(actor, personId, 'stewards.manage');

    await this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: account.id },
        data: { status: suspended ? 'SUSPENDED' : account.passwordHash ? 'ACTIVE' : 'PENDING' },
      });
      if (suspended) {
        await this.sessions.revokeAllForAccount(account.id, tx);
        await tx.authToken.updateMany({
          where: { personId, consumedAt: null, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await this.audit.record(
        { action: suspended ? 'stewards.suspended' : 'stewards.reactivated', actorId: actor.personId, subjectId: personId },
        tx,
      );
    });
    return { ok: true };
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private async sendClaimEmail(personId: string, actorId: string) {
    const person = await this.prisma.person.findUniqueOrThrow({
      where: { id: personId },
      include: {
        account: true,
        assignments: { where: { endedAt: null }, include: { team: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    const ttlHours = this.config.get('CLAIM_TOKEN_TTL_HOURS');
    const token = await this.auth.issueToken(personId, AuthTokenPurpose.CLAIM, ttlHours * HOUR, actorId);
    const url = `${this.config.get('WEB_URL')}/auth/claim?token=${encodeURIComponent(token)}`;
    const appointment = person.assignments[0];
    const mail = stewardInvitationEmail({
      firstName: person.firstName,
      roleLabel: appointment ? ROLE_LABELS[appointment.role] : null,
      teamName: appointment?.team?.name ?? null,
      url,
      expiresInHours: ttlHours,
    });
    try {
      await this.email.send({ to: person.account!.loginEmail, ...mail });
      await this.audit.record({ action: 'stewards.invitation.sent', actorId, subjectId: personId });
      return { delivery: 'SENT' as const };
    } catch {
      // Appointment stands; the admin can retry. Delivery pending ≠ claim success.
      await this.audit.record({ action: 'stewards.invitation.failed', actorId, subjectId: personId });
      return { delivery: 'FAILED' as const };
    }
  }

  private assertCanAppoint(actor: AuthContext, role: Role, teamId: string | null) {
    if (TEAM_SCOPED_ROLES.has(role) && !teamId) {
      throw new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, 'TEAM_REQUIRED', 'Choose a team for this role.', { team_id: 'Required' });
    }
    if (!TEAM_SCOPED_ROLES.has(role) && teamId) {
      throw new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, 'TEAM_NOT_ALLOWED', 'This role is church-wide.', { team_id: 'Not allowed' });
    }
    const churchWide = actor.grants.some((g) => g.capability === 'stewards.invite' && g.scope === 'CHURCH');
    if (churchWide) return;
    // Team leads may appoint stewards and assistant team leads into their own team.
    if ((role !== 'STEWARD' && role !== 'ASSISTANT_TEAM_LEAD') || !can(actor.grants, 'stewards.invite', { teamId })) {
      throw forbidden('Team leads can only invite stewards or assistant team leads to their own team.');
    }
  }

  /** Loads an account the actor is allowed to manage; out-of-scope returns 404 (non-enumerating). */
  private async loadManagedAccount(actor: AuthContext, personId: string, capability: Capability) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: { account: true, assignments: { where: { endedAt: null } } },
    });
    if (!person?.account) throw notFound();
    const churchWide = actor.grants.some((g) => g.capability === capability && g.scope === 'CHURCH');
    if (churchWide) return person.account;

    const inScope = person.assignments.some((a) => a.teamId && can(actor.grants, capability, { teamId: a.teamId }));
    // Team leads cannot manage church-wide roles or other leads.
    const manageableByLead = person.assignments.every((a) => a.role === 'STEWARD' || a.role === 'ASSISTANT_TEAM_LEAD');
    if (!inScope) throw notFound();
    if (!manageableByLead) throw forbidden();
    return person.account;
  }
}
