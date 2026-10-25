import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import type { FoundationClassStatus, MembershipStatus } from '../../generated/prisma/client.js';
import { ZodBody } from '../../platform/http/errors.js';
import { CurrentAuth, RequireCapability, type AuthContext } from '../identity/auth.guard.js';
import { PeopleService } from './people.service.js';

const MembershipStatusEnum = z.enum(['VISITOR', 'FIRST_TIMER', 'FOUNDATION', 'MEMBER', 'WORKER', 'INACTIVE']);
const FoundationStatusEnum = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']);

const VisitorCaptureBody = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(80),
  last_name: z.string().trim().min(1, 'Last name is required').max(80),
  phone: z.string().trim().max(32).optional(),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).optional(),
  address: z.string().trim().max(240).optional(),
  missing_contact_reason: z.string().trim().max(160).optional(),
  service_occurrence_id: z.string().uuid('Select a service occurrence'),
  existing_person_id: z.string().uuid().optional(),
  inviter_person_id: z.string().uuid().optional(),
  prayer_request: z.string().trim().max(1000).optional(),
  birth_month: z.coerce.number().int().min(1).max(12).nullish(),
  birth_day: z.coerce.number().int().min(1).max(31).nullish(),
});

const CreatePersonBody = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(80),
  last_name: z.string().trim().min(1, 'Last name is required').max(80),
  phone: z.string().trim().max(32).nullish(),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).nullish(),
  address: z.string().trim().max(240).nullish(),
  photo_url: z.string().max(400_000).nullish(),
  membership_status: MembershipStatusEnum.optional(),
  foundation_class_status: FoundationStatusEnum.optional(),
  birth_month: z.coerce.number().int().min(1).max(12).nullish(),
  birth_day: z.coerce.number().int().min(1).max(31).nullish(),
  anniversary_month: z.coerce.number().int().min(1).max(12).nullish(),
  anniversary_day: z.coerce.number().int().min(1).max(31).nullish(),
});

const UpdatePersonBody = CreatePersonBody.partial();

const ClaimInvitationBody = z.object({
  email: z.string().trim().email('Enter a valid email').optional(),
  role: z.enum(['ADMIN', 'PASTOR', 'TEAM_LEAD', 'ASSISTANT_TEAM_LEAD', 'STEWARD']).nullish(),
  team_id: z.string().uuid().nullish(),
});

const CreateImportJobBody = z.object({
  file_name: z.string().trim().max(120).optional(),
  csv_text: z.string().min(1, 'CSV content is required').max(1_000_000, 'CSV is too large'),
});

const UpdateImportRowBody = z.object({
  first_name: z.string().trim().max(80).optional(),
  last_name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(32).nullish(),
  email: z.string().trim().max(160).nullish(),
  address: z.string().trim().max(240).nullish(),
  membership_status: MembershipStatusEnum.optional(),
  birth_month: z.coerce.number().int().min(1).max(12).nullish(),
  birth_day: z.coerce.number().int().min(1).max(31).nullish(),
  anniversary_month: z.coerce.number().int().min(1).max(12).nullish(),
  anniversary_day: z.coerce.number().int().min(1).max(31).nullish(),
  approve_review: z.boolean().optional(),
});

const CommitImportJobBody = z.object({
  idempotency_key: z.string().trim().max(128).optional(),
});

const RecommendFoundationBody = z.object({
  note: z.string().trim().min(1, 'Recommendation note is required').max(1000),
  exempt_override: z.boolean().optional(),
  exemption_reason: z.string().trim().max(500).optional(),
});

@Controller('people')
export class PeopleController {
  constructor(private readonly people: PeopleService) {}

  @Get()
  @RequireCapability('people.read')
  list(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('foundation') foundation?: string,
    @Query('celebrations_month') celebrationsMonth?: string,
  ) {
    const validStatus = MembershipStatusEnum.safeParse(status).data as MembershipStatus | undefined;
    const validFoundation = FoundationStatusEnum.safeParse(foundation).data as FoundationClassStatus | undefined;
    const month = celebrationsMonth ? Number(celebrationsMonth) : undefined;
    return this.people.listDirectory({
      search,
      status: validStatus,
      foundation: validFoundation,
      celebrationsMonth: month && month >= 1 && month <= 12 ? month : undefined,
    });
  }

  @Get('candidates')
  @RequireCapability('visitors.capture')
  candidates(
    @Query('phone') phone?: string,
    @Query('email') email?: string,
    @Query('name') name?: string,
  ) {
    return this.people.findCandidates({ phone, email, name });
  }

  @Post('visitor-intakes')
  @RequireCapability('visitors.capture')
  captureVisitor(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodBody(VisitorCaptureBody)) body: z.infer<typeof VisitorCaptureBody>,
  ) {
    return this.people.captureVisitor(auth, body);
  }

  @Post()
  @RequireCapability('people.write')
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodBody(CreatePersonBody)) body: z.infer<typeof CreatePersonBody>,
  ) {
    return this.people.createPerson(auth, body);
  }

  @Patch(':personId')
  @RequireCapability('people.write')
  update(
    @CurrentAuth() auth: AuthContext,
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body(new ZodBody(UpdatePersonBody)) body: z.infer<typeof UpdatePersonBody>,
  ) {
    return this.people.updatePerson(auth, personId, body);
  }

  @Post(':personId/verifications')
  @RequireCapability('people.write')
  @HttpCode(200)
  verify(@CurrentAuth() auth: AuthContext, @Param('personId', ParseUUIDPipe) personId: string) {
    return this.people.verifyPerson(auth, personId);
  }

  @Post(':personId/claim-invitations')
  @RequireCapability('people.write')
  issueClaimInvitation(
    @CurrentAuth() auth: AuthContext,
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body(new ZodBody(ClaimInvitationBody)) body: z.infer<typeof ClaimInvitationBody>,
  ) {
    return this.people.issueClaimInvitation(auth, personId, body);
  }

  // ── Bulk CSV Directory Import (HOF-012-S02 / S03 / S04) ───────────────────

  @Post('import-jobs')
  @RequireCapability('people.import')
  createImportPreview(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodBody(CreateImportJobBody)) body: z.infer<typeof CreateImportJobBody>,
  ) {
    return this.people.createImportPreview(auth, body);
  }

  @Get('import-jobs')
  @RequireCapability('people.import')
  listImportJobs(@CurrentAuth() auth: AuthContext) {
    return this.people.listImportJobs(auth);
  }

  @Get('import-jobs/:jobId')
  @RequireCapability('people.import')
  getImportJob(@CurrentAuth() auth: AuthContext, @Param('jobId', ParseUUIDPipe) jobId: string) {
    return this.people.getImportJob(jobId, auth);
  }

  /** HOF-012-S04: formula-safe CSV of failed and review-required rows (authorized job only). */
  @Get('import-jobs/:jobId/error-report')
  @RequireCapability('people.import')
  async importErrorReport(@CurrentAuth() auth: AuthContext, @Param('jobId', ParseUUIDPipe) jobId: string) {
    return { file_name: `import-${jobId}-errors.csv`, csv: await this.people.buildImportErrorReport(auth, jobId) };
  }

  @Patch('import-jobs/:jobId/rows/:rowId')
  @RequireCapability('people.import')
  updateImportRow(
    @CurrentAuth() auth: AuthContext,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Param('rowId', ParseUUIDPipe) rowId: string,
    @Body(new ZodBody(UpdateImportRowBody)) body: z.infer<typeof UpdateImportRowBody>,
  ) {
    return this.people.updateImportRow(auth, jobId, rowId, body);
  }

  @Post('import-jobs/:jobId/commit')
  @RequireCapability('people.import')
  @HttpCode(200)
  commitImportJob(
    @CurrentAuth() auth: AuthContext,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body(new ZodBody(CommitImportJobBody)) body: z.infer<typeof CommitImportJobBody>,
  ) {
    return this.people.commitImportJob(auth, jobId, body);
  }

  // ── Foundation Eligibility, Recommendation & Handoff (HOF-015) ────────────

  @Get('foundation-eligibility')
  @RequireCapability('visitors.capture')
  listFoundationEligibility() {
    return this.people.listFoundationEligibility();
  }

  @Post(':personId/foundation-recommendations')
  @RequireCapability('visitors.capture')
  @HttpCode(200)
  recommendForFoundation(
    @CurrentAuth() auth: AuthContext,
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body(new ZodBody(RecommendFoundationBody)) body: z.infer<typeof RecommendFoundationBody>,
  ) {
    return this.people.recommendForFoundation(auth, personId, body);
  }
}
