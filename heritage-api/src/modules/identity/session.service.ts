import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppConfig } from '../../platform/config/config.module.js';
import { generateToken, hashToken } from '../../platform/crypto/tokens.js';
import { PrismaService } from '../../platform/database/prisma.module.js';
import type { Prisma } from '../../generated/prisma/client.js';

const HOUR = 60 * 60 * 1000;
/** Avoid a DB write on every request; refresh lastSeenAt at most this often. */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface ResolvedSession {
  sessionId: string;
  accountId: string;
  personId: string;
}

/**
 * Opaque server-side sessions in an HttpOnly cookie (HOF-001).
 * Supports absolute + idle expiry, revocation and suspension checks.
 */
@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  get cookieName() {
    return this.config.get('SESSION_COOKIE_NAME');
  }

  async create(
    accountId: string,
    meta: { ip?: string; userAgent?: string },
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + this.config.get('SESSION_TTL_HOURS') * HOUR);
    await db.session.create({
      data: {
        accountId,
        tokenHash: hashToken(token),
        expiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 255),
      },
    });
    return { token, expiresAt };
  }

  async resolve(token: string | undefined): Promise<ResolvedSession | null> {
    if (!token) return null;
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { account: { select: { id: true, personId: true, status: true } } },
    });
    if (!session || session.revokedAt) return null;

    const now = Date.now();
    const idleLimit = this.config.get('SESSION_IDLE_HOURS') * HOUR;
    if (session.expiresAt.getTime() <= now || session.lastSeenAt.getTime() + idleLimit <= now) {
      return null;
    }
    // HOF-001-S04: suspension takes effect on the very next request.
    if (session.account.status !== 'ACTIVE') return null;

    if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
    }
    return { sessionId: session.id, accountId: session.account.id, personId: session.account.personId };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForAccount(accountId: string, db: Prisma.TransactionClient | PrismaService = this.prisma) {
    await db.session.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  readCookie(req: Request): string | undefined {
    const value = (req.cookies as Record<string, string> | undefined)?.[this.cookieName];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  writeCookie(res: Response, token: string, expiresAt: Date) {
    res.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });
  }

  clearCookie(res: Response) {
    res.clearCookie(this.cookieName, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }
}
