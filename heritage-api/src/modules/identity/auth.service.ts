import { HttpStatus, Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { AuthTokenPurpose } from '../../generated/prisma/client.js';
import { AppConfig } from '../../platform/config/config.module.js';
import { AuditService } from '../../platform/audit/audit.module.js';
import { generateToken, hashToken, maskEmail, normalizeEmail } from '../../platform/crypto/tokens.js';
import { PrismaService } from '../../platform/database/prisma.module.js';
import { EmailService } from '../../platform/email/email.module.js';
import { magicLoginEmail } from '../../platform/email/templates.js';
import { ApiError } from '../../platform/http/errors.js';
import { CAPABILITIES, can, ROLE_LABELS, type Grant } from '../access/capabilities.js';
import { SessionService } from './session.service.js';

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const MINUTE = 60 * 1000;

/** Pre-computed hash so unknown-account logins cost the same as real ones (no timing oracle). */
const DUMMY_HASH_PROMISE = argon2.hash('heritage-timing-equaliser');

// Generic failures — identical for unknown account / wrong password / suspended (HOF-001-S02).
const INVALID_CREDENTIALS = () =>
  new ApiError(HttpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
const TOKEN_UNUSABLE = () =>
  new ApiError(
    HttpStatus.GONE,
    'TOKEN_UNUSABLE',
    'This link is invalid, expired or has already been used. Ask your team lead or the church admin to send a new one.',
  );

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
  ) {}

  // ── Password login (HOF-001-S01/S02) ──────────────────────────────────────

  async login(emailInput: string, password: string, meta: RequestMeta) {
    const loginEmail = normalizeEmail(emailInput);
    const account = await this.prisma.account.findUnique({ where: { loginEmail } });

    const hash = account?.passwordHash ?? (await DUMMY_HASH_PROMISE);
    const passwordOk = await argon2.verify(hash, password).catch(() => false);

    if (!account || !account.passwordHash || !passwordOk || account.status !== 'ACTIVE') {
      await this.audit.record({
        action: 'auth.login.failed',
        subjectId: account?.id ?? null,
        metadata: { email: maskEmail(loginEmail) },
        ip: meta.ip,
      });
      throw INVALID_CREDENTIALS();
    }

    const session = await this.sessions.create(account.id, meta);
    await this.prisma.account.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({ action: 'auth.login.succeeded', actorId: account.personId, ip: meta.ip });
    return session;
  }

  async logout(sessionId: string, personId: string) {
    await this.sessions.revoke(sessionId);
    await this.audit.record({ action: 'auth.logout', actorId: personId });
  }

  // ── Magic link (HOF-002-S05) ──────────────────────────────────────────────

  /** Always resolves the same way whether or not the email exists (non-enumerating). */
  async requestMagicLink(emailInput: string, meta: RequestMeta): Promise<void> {
    const loginEmail = normalizeEmail(emailInput);
    const account = await this.prisma.account.findUnique({
      where: { loginEmail },
      include: { person: { select: { firstName: true } } },
    });
    if (!account || account.status !== 'ACTIVE') {
      await this.audit.record({ action: 'auth.magic_link.ignored', metadata: { email: maskEmail(loginEmail) }, ip: meta.ip });
      return;
    }

    const ttlMinutes = this.config.get('MAGIC_LINK_TTL_MINUTES');
    const token = await this.issueToken(account.personId, AuthTokenPurpose.MAGIC_LOGIN, ttlMinutes * MINUTE);
    const url = `${this.config.get('WEB_URL')}/auth/magic?token=${encodeURIComponent(token)}`;
    const mail = magicLoginEmail({ firstName: account.person.firstName, url, expiresInMinutes: ttlMinutes });
    await this.email.send({ to: account.loginEmail, ...mail });
    await this.audit.record({ action: 'auth.magic_link.sent', actorId: account.personId, ip: meta.ip });
  }

  async exchangeMagicLink(rawToken: string, meta: RequestMeta) {
    return this.prisma.$transaction(async (tx) => {
      const token = await this.consumeToken(tx, rawToken, AuthTokenPurpose.MAGIC_LOGIN);
      const account = await tx.account.findUnique({ where: { personId: token.personId } });
      if (!account || account.status !== 'ACTIVE') throw TOKEN_UNUSABLE();

      const session = await this.sessions.create(account.id, meta, tx);
      await tx.account.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
      await this.audit.record({ action: 'auth.magic_link.exchanged', actorId: account.personId, ip: meta.ip }, tx);
      return session;
    });
  }

  // ── Steward invitation claim (HOF-002-S01/S03/S04) ────────────────────────

  /** GET-safe preview: never consumes the token, so mail scanners are harmless. */
  async inspectToken(rawToken: string) {
    const token = await this.prisma.authToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: {
        person: {
          select: {
            firstName: true,
            lastName: true,
            account: { select: { loginEmail: true } },
            assignments: { where: { endedAt: null }, select: { role: true, team: { select: { name: true } } } },
          },
        },
      },
    });
    if (!token || !isUsable(token)) throw TOKEN_UNUSABLE();
    return {
      purpose: token.purpose,
      first_name: token.person.firstName,
      last_name: token.person.lastName,
      email: token.person.account ? maskEmail(token.person.account.loginEmail) : null,
      appointments: token.person.assignments.map((a) => ({
        role: a.role,
        role_label: ROLE_LABELS[a.role],
        team_name: a.team?.name ?? null,
      })),
      expires_at: token.expiresAt.toISOString(),
    };
  }

  /** Consume token + set password + activate account + open session — one transaction. */
  async completeClaim(rawToken: string, password: string, meta: RequestMeta) {
    const passwordHash = await argon2.hash(password);
    return this.prisma.$transaction(async (tx) => {
      const token = await this.consumeToken(tx, rawToken, AuthTokenPurpose.CLAIM);
      const account = await tx.account.findUnique({ where: { personId: token.personId } });
      if (!account || account.status === 'SUSPENDED') throw TOKEN_UNUSABLE();

      await tx.account.update({
        where: { id: account.id },
        data: { passwordHash, status: 'ACTIVE', lastLoginAt: new Date() },
      });
      // Any other outstanding claim links for this person are now dead.
      await tx.authToken.updateMany({
        where: { personId: token.personId, purpose: AuthTokenPurpose.CLAIM, consumedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      const session = await this.sessions.create(account.id, meta, tx);
      await this.audit.record({ action: 'auth.claim.completed', actorId: token.personId, ip: meta.ip }, tx);
      return session;
    });
  }

  // ── Current user ──────────────────────────────────────────────────────────

  async me(personId: string, grants: Grant[]) {
    const person = await this.prisma.person.findUniqueOrThrow({
      where: { id: personId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        account: { select: { loginEmail: true } },
        assignments: {
          where: { endedAt: null },
          select: { id: true, role: true, team: { select: { id: true, key: true, name: true } } },
        },
      },
    });
    return {
      person_id: person.id,
      first_name: person.firstName,
      last_name: person.lastName,
      email: person.account?.loginEmail ?? null,
      assignments: person.assignments.map((a) => ({
        id: a.id,
        role: a.role,
        role_label: ROLE_LABELS[a.role],
        team: a.team,
      })),
      // Flattened for UI gating; the API re-checks every request.
      capabilities: CAPABILITIES.filter((c) => can(grants, c)),
    };
  }

  // ── Token helpers (shared with stewards module) ───────────────────────────

  async issueToken(personId: string, purpose: AuthTokenPurpose, ttlMs: number, createdById?: string) {
    const raw = generateToken();
    await this.prisma.$transaction([
      // Resend revokes previous tokens of the same purpose (master-architecture §5).
      this.prisma.authToken.updateMany({
        where: { personId, purpose, consumedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.authToken.create({
        data: { personId, purpose, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + ttlMs), createdById },
      }),
    ]);
    return raw;
  }

  /**
   * Atomic single-use consumption. The conditional UPDATE means that when two
   * requests race, exactly one sees count=1 (HOF-002-S04).
   */
  private async consumeToken(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    rawToken: string,
    purpose: AuthTokenPurpose,
  ) {
    const tokenHash = hashToken(rawToken);
    const result = await tx.authToken.updateMany({
      where: { tokenHash, purpose, consumedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    if (result.count !== 1) throw TOKEN_UNUSABLE();
    return tx.authToken.findUniqueOrThrow({ where: { tokenHash } });
  }
}

function isUsable(t: { consumedAt: Date | null; revokedAt: Date | null; expiresAt: Date }) {
  return !t.consumedAt && !t.revokedAt && t.expiresAt.getTime() > Date.now();
}
