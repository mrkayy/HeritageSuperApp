import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
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
  identity_confirmed: z.boolean().optional(),
  // Optional member photo URL or base64 data URI (HOF-002-S01)
  photo_url: z.string().max(400_000, 'Photo is too large (max ~300KB)').nullish(),
  // Optional 4–6 digit quick-unlock PIN (HOF-002-S01)
  pin: z
    .union([
      z.literal(''),
      z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits'),
    ])
    .nullish(),
});

const LinkAuthMethodBody = z.object({
  provider: z.string().trim().min(2).max(32),
  provider_sub: z.string().trim().min(2).max(128),
  provider_email: z.string().trim().email().nullish(),
});

const UnlinkAuthMethodBody = z.object({
  password: z.string().max(256).optional(),
  pin: z.string().max(16).optional(),
});

/** Strict throttle on unauthenticated endpoints (per IP). */
const AUTH_THROTTLE = {
  default: { limit: process.env.NODE_ENV === 'test' ? 100 : 10, ttl: 60_000 },
};

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
    const { token, expiresAt } = await this.auth.completeClaim(
      {
        token: body.token,
        password: body.password,
        identity_confirmed: body.identity_confirmed,
        photo_url: body.photo_url,
        pin: body.pin || null,
      },
      meta(req),
    );
    this.sessions.writeCookie(res, token, expiresAt);
    return { ok: true };
  }

  @Post('methods/link')
  linkMethod(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodBody(LinkAuthMethodBody)) body: z.infer<typeof LinkAuthMethodBody>,
  ) {
    return this.auth.linkAuthMethod(auth.accountId, auth.personId, body);
  }

  @Delete('methods/:methodId')
  @HttpCode(200)
  unlinkMethod(
    @CurrentAuth() auth: AuthContext,
    @Param('methodId') methodId: string,
    @Body(new ZodBody(UnlinkAuthMethodBody)) body: z.infer<typeof UnlinkAuthMethodBody>,
  ) {
    return this.auth.unlinkAuthMethod(auth.accountId, auth.personId, auth.sessionId, methodId, body);
  }
}

function meta(req: Request) {
  return { ip: req.ip, userAgent: req.header('user-agent') };
}
