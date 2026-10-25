import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../platform/database/prisma.module.js';
import { can, expandGrants, type Capability, type Grant } from '../access/capabilities.js';
import { SessionService } from './session.service.js';

export interface AuthContext {
  sessionId: string;
  accountId: string;
  personId: string;
  grants: Grant[];
  /** Active assignments, resolved server-side on every request (revocation is immediate). */
  assignments: { id: string; role: string; teamId: string | null }[];
}

export type AuthedRequest = Request & { auth?: AuthContext };

const PUBLIC_KEY = 'heritage:public';
const CAPABILITY_KEY = 'heritage:capability';

/** Opt a route out of authentication. Everything else is authenticated by default. */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

/** Require a capability (in any scope). Services enforce team scope on the resource. */
export const RequireCapability = (capability: Capability) => SetMetadata(CAPABILITY_KEY, capability);

export const CurrentAuth = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthContext => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  if (!req.auth) throw new UnauthorizedException();
  return req.auth;
});

/** Global guard: default-deny authentication + capability check. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets)) return true;

    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const session = await this.sessions.resolve(this.sessions.readCookie(req));
    if (!session) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Please sign in to continue.',
        field_errors: {},
      });
    }

    const assignments = await this.prisma.assignment.findMany({
      where: { personId: session.personId, endedAt: null },
      select: {
        id: true,
        role: true,
        teamId: true,
        team: { select: { key: true } },
      },
    });
    const assignmentContexts = assignments.map((a) => ({
      id: a.id,
      role: a.role,
      teamId: a.teamId,
      teamKey: a.team?.key ?? null,
    }));
    const grants = expandGrants(assignmentContexts);
    req.auth = { ...session, assignments: assignmentContexts, grants };

    const required = this.reflector.getAllAndOverride<Capability | undefined>(CAPABILITY_KEY, targets);
    if (required && !can(grants, required)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to do this.',
        field_errors: {},
      });
    }
    return true;
  }
}
