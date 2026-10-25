import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import type { FollowUpTaskStatus } from '../../generated/prisma/client.js';
import { ZodBody } from '../../platform/http/errors.js';
import { CurrentAuth, RequireCapability, type AuthContext } from '../identity/auth.guard.js';
import { FollowUpService } from './followup.service.js';

const ScopeEnum = z.enum(['mine', 'unassigned', 'all', 'pastoral']);
const StatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED']);
const OutcomeEnum = z.enum([
  'REACHED',
  'UNREACHABLE',
  'VOICEMAIL',
  'WRONG_NUMBER',
  'REQUESTED_PRAYER',
  'NEEDS_PASTORAL_VISIT',
]);

const AssignBody = z.object({
  assignee_person_id: z.string().uuid('Choose a valid steward'),
  due_at: z.string().optional(),
});

const OutcomeBody = z.object({
  outcome: OutcomeEnum,
  note: z.string().trim().max(1000).optional(),
  needs_pastoral_visit: z.boolean().optional(),
  next_action_at: z.string().optional(),
  mark_completed: z.boolean().optional(),
});

@Controller('follow-ups')
export class FollowUpController {
  constructor(private readonly followups: FollowUpService) {}

  @Get()
  @RequireCapability('followups.read')
  list(
    @CurrentAuth() auth: AuthContext,
    @Query('scope') scope?: string,
    @Query('status') status?: string,
  ) {
    return this.followups.listQueue(auth, {
      scope: ScopeEnum.safeParse(scope).data,
      status: StatusEnum.safeParse(status).data as FollowUpTaskStatus | undefined,
    });
  }

  @Get('callers')
  @RequireCapability('followups.assign')
  callers() {
    return this.followups.listCallers();
  }

  @Post(':taskId/assign')
  @RequireCapability('followups.assign')
  @HttpCode(200)
  assign(
    @CurrentAuth() auth: AuthContext,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body(new ZodBody(AssignBody)) body: z.infer<typeof AssignBody>,
  ) {
    return this.followups.assignTask(auth, taskId, body.assignee_person_id, body.due_at);
  }

  @Post(':taskId/outcomes')
  @RequireCapability('followups.record')
  recordOutcome(
    @CurrentAuth() auth: AuthContext,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body(new ZodBody(OutcomeBody)) body: z.infer<typeof OutcomeBody>,
  ) {
    return this.followups.recordOutcome(auth, taskId, body);
  }
}
