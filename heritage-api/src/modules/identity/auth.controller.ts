import { Body, Controller, Get, HttpCode, Post, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ZodBody } from '../../platform/http/errors.js';
import { AuthService } from './auth.service.js';
import { CurrentAuth, Public, type AuthContext } from './auth.guard.js';
import { SessionService } from './session.service.js';

const LoginBody = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password').max(256),
});

const EmailBody = z.object({ email: z.string().trim().email('Enter a valid email address') });

const TokenBody = z.object({ token: z.string().min(20).max(128) });

const ClaimBody = TokenBody.extend({
  password: z
    .string()
    .min(10, 'Use at least 10 characters')
    .max(256)
    .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Include at least one letter and one number'),
});

/** Strict throttle on unauthenticated endpoints (per IP). */
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodBody(LoginBody)) body: z.infer<typeof LoginBody>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, expiresAt } = await this.auth.login(body.email, body.password, meta(req));
    this.sessions.writeCookie(res, token, expiresAt);
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentAuth() auth: AuthContext, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(auth.sessionId, auth.personId);
    this.sessions.clearCookie(res);
    return { ok: true };
  }

  @Get('me')
  me(@CurrentAuth() auth: AuthContext) {
    return this.auth.me(auth.personId, auth.grants);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('magic-link')
  @HttpCode(202)
  async requestMagicLink(@Body(new ZodBody(EmailBody)) body: z.infer<typeof EmailBody>, @Req() req: Request) {
    await this.auth.requestMagicLink(body.email, meta(req));
    return { message: 'If that email belongs to an active account, a sign-in link is on its way.' };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('magic-link/exchange')
  @HttpCode(200)
  async exchangeMagicLink(
    @Body(new ZodBody(TokenBody)) body: z.infer<typeof TokenBody>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, expiresAt } = await this.auth.exchangeMagicLink(body.token, meta(req));
    this.sessions.writeCookie(res, token, expiresAt);
    return { ok: true };
  }

  /** Read-only preview used by the claim page. Never consumes. */
  @Public()
  @Throttle(AUTH_THROTTLE)
  @Get('claims/inspect')
  inspect(@Query('token') token = '') {
    // Malformed tokens simply fail lookup and return the same generic 410.
    return this.auth.inspectToken(token.slice(0, 128));
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('claims/complete')
  @HttpCode(200)
  async completeClaim(
    @Body(new ZodBody(ClaimBody)) body: z.infer<typeof ClaimBody>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { token, expiresAt } = await this.auth.completeClaim(body.token, body.password, meta(req));
    this.sessions.writeCookie(res, token, expiresAt);
    return { ok: true };
  }
}

function meta(req: Request) {
  return { ip: req.ip, userAgent: req.header('user-agent') };
}
