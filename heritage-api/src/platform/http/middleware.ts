import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { AppConfig } from '../config/config.module.js';

/** Attaches a correlation id to every request and echoes it back. */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { requestId?: string }, res: Response, next: NextFunction) {
    const incoming = req.header('x-request-id');
    req.requestId = incoming && incoming.length <= 64 ? incoming : randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defence for cookie-authenticated mutations (master-architecture §6):
 * SameSite=Lax cookies + strict Origin/Referer allowlist on unsafe methods.
 */
@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  private readonly allowed: Set<string>;
  constructor(private readonly config: AppConfig) {
    this.allowed = new Set(config.get('ALLOWED_ORIGINS'));
  }

  use(req: Request, _res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.header('origin') ?? originFromReferer(req.header('referer'));
    // Server-to-server calls (TanStack Start SSR) send no Origin but carry our marker header.
    if (!origin && req.header('x-heritage-client') === 'web-ssr') return next();
    if (origin && this.allowed.has(origin)) return next();
    if (!this.config.isProduction && origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return next();
    }
    throw new ForbiddenException({
      code: 'ORIGIN_REJECTED',
      message: 'Request origin is not allowed.',
      field_errors: {},
    });
  }
}

function originFromReferer(referer?: string): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}
