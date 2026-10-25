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
import { BASELINE_SELF_CAPABILITIES, CAPABILITIES, can, ROLE_LABELS, type Grant } from '../access/capabilities.js';
import { SessionService } from './session.service.js';

interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

export interface ClaimCompleteInput {
  token: string;
  password: string;
  identity_confirmed?: boolean;
  photo_url?: string | null;
  pin?: string | null;
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
      await this.audit.record({
        action: 'auth.magic_link.ignored',
        metadata: { email: maskEmail(loginEmail) },
        ip: meta.ip,
      });
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

  // ── Controlled Account Claim & Onboarding Wizard (HOF-002-S01/S03/S04) ────

  /** GET-safe preview: never consumes the token, so mail scanners are harmless. */
  async inspectToken(rawToken: string) {
    const token = await this.prisma.authToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: {
        person: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            photoUrl: true,
            isVerified: true,
            membershipStatus: true,
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
      masked_phone: token.person.phone ? maskPhone(token.person.phone) : null,
      photo_url: token.person.photoUrl,
      is_verified: token.person.isVerified,
      membership_status: token.person.membershipStatus,
      appointments: token.person.assignments.map((a) => ({
        role: a.role,
        role_label: ROLE_LABELS[a.role],
        team_name: a.team?.name ?? null,
      })),
      baseline_capabilities: BASELINE_SELF_CAPABILITIES,
      expires_at: token.expiresAt.toISOString(),
    };
  }

  /**
   * HOF-002-S01:
   * - Requires explicit identity confirmation
   * - Consumes claim token, links verified Person, sets password, optionally saves
   *   member photoUrl and hashed quick-unlock PIN, and activates Account atomically
   * - Grants baseline SELF capabilities without inferring any ministry appointment
   */
  async completeClaim(input: ClaimCompleteInput, meta: RequestMeta) {
    if (input.identity_confirmed === false) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'IDENTITY_NOT_CONFIRMED',
        'Please confirm that these profile details belong to you before activating the account.',
        { identity_confirmed: 'Confirm your identity to continue' },
      );
    }

    const passwordHash = await argon2.hash(input.password);
    const pinHash = input.pin ? await argon2.hash(input.pin) : null;

    return this.prisma.$transaction(async (tx) => {
      const token = await this.consumeToken(tx, input.token, AuthTokenPurpose.CLAIM);
      const account = await tx.account.findUnique({ where: { personId: token.personId } });
      if (!account || account.status === 'SUSPENDED') throw TOKEN_UNUSABLE();

      if (input.photo_url !== undefined) {
        await tx.person.update({
          where: { id: token.personId },
          data: {
            photoUrl: input.photo_url?.trim() || null,
            version: { increment: 1 },
          },
        });
      }

      await tx.account.update({
        where: { id: account.id },
        data: {
          passwordHash,
          ...(pinHash ? { pinHash } : {}),
          status: 'ACTIVE',
          lastLoginAt: new Date(),
        },
      });
      // Any other outstanding claim links for this person are now dead.
      await tx.authToken.updateMany({
        where: { personId: token.personId, purpose: AuthTokenPurpose.CLAIM, consumedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      const session = await this.sessions.create(account.id, meta, tx);
      await this.audit.record(
        {
          action: 'auth.claim.completed',
          actorId: token.personId,
          ip: meta.ip,
          metadata: {
            hasPhoto: Boolean(input.photo_url?.trim()),
            hasPin: Boolean(pinHash),
          },
        },
        tx,
      );
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
        photoUrl: true,
        isVerified: true,
        membershipStatus: true,
        foundationClassStatus: true,
        account: {
          select: {
            loginEmail: true,
            pinHash: true,
            passwordHash: true,
            authMethods: { select: { id: true, provider: true, providerEmail: true, createdAt: true } },
          },
        },
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
      photo_url: person.photoUrl,
      is_verified: person.isVerified,
      membership_status: person.membershipStatus,
      foundation_class_status: person.foundationClassStatus,
      email: person.account?.loginEmail ?? null,
      has_pin: Boolean(person.account?.pinHash),
      has_password: Boolean(person.account?.passwordHash),
      auth_methods:
        person.account?.authMethods.map((m) => ({
          id: m.id,
          provider: m.provider,
          provider_email: m.providerEmail,
          created_at: m.createdAt.toISOString(),
        })) ?? [],
      assignments: person.assignments.map((a) => ({
        id: a.id,
        role: a.role,
        role_label: ROLE_LABELS[a.role],
        team: a.team,
      })),
      baseline_capabilities: BASELINE_SELF_CAPABILITIES,
      // Flattened for UI gating; the API re-checks every request.
      capabilities: CAPABILITIES.filter((c) => can(grants, c)),
    };
  }

  // ── Authentication-Method Linking & Unlinking (HOF-003-S04) ───────────────

  /**
   * Link an external provider (e.g. Google) to the authenticated account.
   */
  async linkAuthMethod(
    accountId: string,
    personId: string,
    input: { provider: string; provider_sub: string; provider_email?: string | null },
  ) {
    const provider = input.provider.trim().toLowerCase();
    const providerSub = input.provider_sub.trim();
    const providerEmail = input.provider_email?.trim() ? normalizeEmail(input.provider_email) : null;

    const existing = await this.prisma.authMethod.findUnique({
      where: { provider_providerSub: { provider, providerSub } },
    });
    if (existing && existing.accountId !== accountId) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'AUTH_METHOD_ALREADY_LINKED',
        'This external authentication account is already linked to another member.',
      );
    }

    const method =
      existing ??
      (await this.prisma.authMethod.create({
        data: {
          accountId,
          provider,
          providerSub,
          providerEmail,
        },
      }));

    await this.audit.record({
      action: 'auth.method.linked',
      actorId: personId,
      subjectId: method.id,
      metadata: { provider, providerEmail },
    });

    return {
      id: method.id,
      provider: method.provider,
      provider_email: method.providerEmail,
      created_at: method.createdAt.toISOString(),
    };
  }

  /**
   * HOF-003-S04: Unlinking preserves a usable account.
   * - Requires reauthentication (current password or PIN verification, or a fresh session < 5 minutes old).
   * - Removes the linked method ONLY if another usable independent login method (passwordHash or another AuthMethod)
   *   remains on the account.
   * - Refuses removing the final authentication method with recovery guidance.
   */
  async unlinkAuthMethod(
    accountId: string,
    personId: string,
    sessionId: string,
    methodId: string,
    reauth: { password?: string; pin?: string },
  ) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { authMethods: true },
    });
    if (!account) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'ACCOUNT_NOT_FOUND', 'Account not found.');
    }

    const target = account.authMethods.find((m) => m.id === methodId || m.provider === methodId.toLowerCase());
    if (!target) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'AUTH_METHOD_NOT_FOUND', 'Linked authentication method not found.');
    }

    // Verify reauthentication
    let reauthed = false;
    if (reauth.password && account.passwordHash) {
      reauthed = await argon2.verify(account.passwordHash, reauth.password).catch(() => false);
    } else if (reauth.pin && account.pinHash) {
      reauthed = await argon2.verify(account.pinHash, reauth.pin).catch(() => false);
    } else {
      // Allow if no password/PIN is set yet AND the current session was authenticated within the last 5 minutes
      const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
      if (
        !account.passwordHash &&
        !account.pinHash &&
        session &&
        Date.now() - session.createdAt.getTime() <= 5 * MINUTE
      ) {
        reauthed = true;
      }
    }

    if (!reauthed) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'REAUTHENTICATION_REQUIRED',
        'Please confirm your current password or PIN before unlinking an authentication method.',
      );
    }

    // Check that another usable independent authentication method remains (HOF-003-S04)
    const remainingProviders = account.authMethods.filter((m) => m.id !== target.id);
    const hasUsablePassword = Boolean(account.passwordHash);
    if (!hasUsablePassword && remainingProviders.length === 0) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'LAST_AUTH_METHOD_CANNOT_BE_REMOVED',
        'Cannot remove your only sign-in method. Set a password first or contact the Membership / Information Center team for account recovery assistance.',
      );
    }

    await this.prisma.authMethod.delete({ where: { id: target.id } });
    await this.audit.record({
      action: 'auth.method.unlinked',
      actorId: personId,
      subjectId: target.id,
      metadata: { provider: target.provider },
    });

    return {
      ok: true,
      removed_id: target.id,
      provider: target.provider,
    };
  }

  // ── Token helpers (shared with stewards & people modules) ─────────────────

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

function maskPhone(phone: string): string {
  const clean = phone.trim();
  if (clean.length <= 4) return '****';
  return `${'*'.repeat(Math.max(2, clean.length - 4))}${clean.slice(-4)}`;
}
