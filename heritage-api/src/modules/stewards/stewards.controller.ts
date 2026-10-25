import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodBody } from '../../platform/http/errors.js';
import { CurrentAuth, RequireCapability, type AuthContext } from '../identity/auth.guard.js';
import { StewardsService } from './stewards.service.js';

const InviteBody = z.object({
  first_name: z.string().trim().min(1, 'Required').max(80),
  last_name: z.string().trim().min(1, 'Required').max(80),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().max(32).optional(),
  role: z.enum(['ADMIN', 'PASTOR', 'TEAM_LEAD', 'ASSISTANT_TEAM_LEAD', 'STEWARD']),
  team_id: z.string().uuid().nullish(),
});

@Controller('stewards')
export class StewardsController {
  constructor(private readonly stewards: StewardsService) {}

  @Get()
  @RequireCapability('stewards.read')
  list(@CurrentAuth() auth: AuthContext) {
    return this.stewards.list(auth);
  }

  @Post('invitations')
  @RequireCapability('stewards.invite')
  invite(@CurrentAuth() auth: AuthContext, @Body(new ZodBody(InviteBody)) body: z.infer<typeof InviteBody>) {
    return this.stewards.invite(auth, body);
  }

  @Post(':personId/invitations/resend')
  @RequireCapability('stewards.invite')
  @HttpCode(200)
  resend(@CurrentAuth() auth: AuthContext, @Param('personId', ParseUUIDPipe) personId: string) {
    return this.stewards.resendInvitation(auth, personId);
  }

  @Post(':personId/suspend')
  @RequireCapability('stewards.manage')
  @HttpCode(200)
  suspend(@CurrentAuth() auth: AuthContext, @Param('personId', ParseUUIDPipe) personId: string) {
    return this.stewards.setSuspended(auth, personId, true);
  }

  @Post(':personId/reactivate')
  @RequireCapability('stewards.manage')
  @HttpCode(200)
  reactivate(@CurrentAuth() auth: AuthContext, @Param('personId', ParseUUIDPipe) personId: string) {
    return this.stewards.setSuspended(auth, personId, false);
  }
}
