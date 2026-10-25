import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import type { LandmarkApprovalStatus, LeapDayPolicy } from '../../generated/prisma/client.js';
import { ZodBody } from '../../platform/http/errors.js';
import { CurrentAuth, Public, RequireCapability, type AuthContext } from '../identity/auth.guard.js';
import { CelebrationsService } from './celebrations.service.js';

const LeapDayPolicyEnum = z.enum(['FEB_28', 'MAR_01']);
const CelebrationKindEnum = z.enum(['BIRTHDAY', 'ANNIVERSARY']);
const ContactChannelEnum = z.enum(['CALL', 'EMAIL_GREETING', 'WHATSAPP_SMS', 'IN_PERSON']);
const LandmarkCategoryEnum = z.enum([
  'GRADUATION',
  'WEDDING',
  'BABY_DEDICATION',
  'CAREER_MILESTONE',
  'OTHER',
]);
const PublicationPreferenceEnum = z.enum(['PRIVATE', 'ALLOW_BULLETIN']);
const ApprovalStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

const EvaluateRemindersBody = z.object({
  local_date: z.string().trim().optional(),
  timezone: z.string().trim().max(64).optional(),
  leap_day_policy: LeapDayPolicyEnum.optional(),
  window_days: z.coerce.number().int().min(0).max(14).optional(),
});

const RecordContactBody = z.object({
  person_id: z.string().uuid('Select a person'),
  kind: CelebrationKindEnum,
  celebration_year: z.coerce.number().int().min(2000).max(2100).optional(),
  channel: ContactChannelEnum,
  outcome: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500).optional(),
  idempotency_key: z.string().trim().max(160).optional(),
});

const CreateLandmarkBody = z.object({
  person_id: z.string().uuid('Select a person'),
  category: LandmarkCategoryEnum.default('GRADUATION'),
  title: z.string().trim().min(1, 'Landmark title is required').max(160),
  description: z.string().trim().max(1000).nullish(),
  occurred_on: z.string().trim().max(32).nullish(),
  publication_preference: PublicationPreferenceEnum.optional(),
});

const ReviewLandmarkBody = z.object({
  publication_preference: PublicationPreferenceEnum.optional(),
  approval_status: ApprovalStatusEnum.optional(),
  review_note: z.string().trim().max(400).nullish(),
});

@Controller('celebrations')
export class CelebrationsController {
  constructor(private readonly celebrations: CelebrationsService) {}

  @Get()
  @RequireCapability('celebrations.read')
  overview(
    @CurrentAuth() auth: AuthContext,
    @Query('local_date') localDate?: string,
    @Query('timezone') timezone?: string,
    @Query('leap_day_policy') leapDayPolicy?: string,
    @Query('window_days') windowDays?: string,
    @Query('month') month?: string,
  ) {
    const validPolicy = LeapDayPolicyEnum.safeParse(leapDayPolicy).data as LeapDayPolicy | undefined;
    const parsedWindow = windowDays !== undefined ? Number(windowDays) : undefined;
    const parsedMonth = month !== undefined ? Number(month) : undefined;
    return this.celebrations.getCelebrationsOverview(auth, {
      local_date: localDate,
      timezone,
      leap_day_policy: validPolicy,
      window_days:
        parsedWindow !== undefined && !Number.isNaN(parsedWindow) && parsedWindow >= 0 && parsedWindow <= 14
          ? parsedWindow
          : undefined,
      month: parsedMonth && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : undefined,
    });
  }

  /**
   * HOF-022-S01 / S02: Explicit daily scheduler evaluation endpoint.
   * Running this twice on the same local date is idempotent and returns a single
   * reminder per upcoming celebration.
   */
  @Post('evaluate')
  @RequireCapability('celebrations.read')
  @HttpCode(200)
  evaluate(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodBody(EvaluateRemindersBody)) body: z.infer<typeof EvaluateRemindersBody>,
  ) {
    return this.celebrations.evaluateReminders(auth, body);
  }

  /**
   * HOF-022-S04: Log a celebration call or dispatch an allowed greeting with idempotency protection.
   */
  @Post('contacts')
  @RequireCapability('celebrations.contact')
  @HttpCode(200)
  recordContact(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodBody(RecordContactBody)) body: z.infer<typeof RecordContactBody>,
  ) {
    return this.celebrations.recordCelebrationContact(auth, body);
  }

  // ── Life Landmarks & Academic Graduation Tracker (HOF-022-S03) ────────────

  @Get('landmarks')
  @RequireCapability('celebrations.read')
  listLandmarks(
    @Query('person_id') personId?: string,
    @Query('approval_status') approvalStatus?: string,
  ) {
    const validStatus = ApprovalStatusEnum.safeParse(approvalStatus).data as LandmarkApprovalStatus | undefined;
    return this.celebrations.listLandmarks({
      personId,
      approvalStatus: validStatus,
    });
  }

  /**
   * HOF-022-S03: Public / church bulletin feed. Only landmarks with BOTH
   * `publication_preference = ALLOW_BULLETIN` AND `approval_status = APPROVED` appear here.
   */
  @Get('landmarks/bulletin')
  @Public()
  listBulletin() {
    return this.celebrations.listPublicBulletinLandmarks();
  }

  @Post('landmarks')
  @RequireCapability('landmarks.write')
  createLandmark(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodBody(CreateLandmarkBody)) body: z.infer<typeof CreateLandmarkBody>,
  ) {
    return this.celebrations.createLandmark(auth, body);
  }

  @Patch('landmarks/:landmarkId')
  @RequireCapability('landmarks.approve')
  reviewLandmark(
    @CurrentAuth() auth: AuthContext,
    @Param('landmarkId', ParseUUIDPipe) landmarkId: string,
    @Body(new ZodBody(ReviewLandmarkBody)) body: z.infer<typeof ReviewLandmarkBody>,
  ) {
    return this.celebrations.reviewLandmark(auth, landmarkId, body);
  }
}
