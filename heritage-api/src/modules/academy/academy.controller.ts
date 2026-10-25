import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import type { AcademyModuleCode } from '../../generated/prisma/client.js';
import { ZodBody } from '../../platform/http/errors.js';
import { CurrentAuth, RequireCapability, type AuthContext } from '../identity/auth.guard.js';
import { AcademyService } from './academy.service.js';

const ModuleCodeEnum = z.enum(['FOUNDATION_101', 'MEMBERSHIP_201']);
const MembershipStatusEnum = z.enum(['VISITOR', 'FIRST_TIMER', 'FOUNDATION', 'MEMBER', 'WORK_FORCE', 'INACTIVE']);
const FoundationStatusEnum = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']);

const CreateCohortBody = z.object({
  module_code: ModuleCodeEnum.optional(),
  title: z.string().trim().min(1, 'Cohort title is required').max(140),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  rule_version: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
  teacher_person_ids: z.array(z.string().uuid()).optional(),
  session_titles: z.array(z.string().trim().min(1).max(140)).length(6).optional(),
});

const AssignTeachersBody = z.object({
  teacher_person_ids: z.array(z.string().uuid()),
});

const EnrollStudentBody = z.object({
  person_id: z.string().uuid('Select a valid person'),
  prerequisite_override: z.boolean().optional(),
  override_reason: z.string().trim().max(500).optional(),
});

const SessionProgressBody = z.object({
  credited_sessions: z.array(z.coerce.number().int()),
});

const RubricGradesBody = z.object({
  scores: z.tuple([
    z.coerce.number(),
    z.coerce.number(),
    z.coerce.number(),
    z.coerce.number(),
    z.coerce.number(),
    z.coerce.number(),
  ]),
});

const MakeupDecisionBody = z.object({
  approved: z.boolean(),
  reason: z.string().trim().min(1, 'Makeup decision reason is required').max(500),
});

const WithdrawEnrollmentBody = z.object({
  reason: z.string().trim().min(1, 'Withdrawal reason is required').max(500),
});

const StandingOverrideBody = z.object({
  person_id: z.string().uuid('Select a valid person'),
  to_status: MembershipStatusEnum,
  to_foundation_status: FoundationStatusEnum.optional(),
  reason: z.string().trim().min(1, 'Override reason is required').max(500),
  rule_version: z.string().trim().max(80).optional(),
  evidence_note: z.string().trim().max(500).optional(),
});

@Controller('academy')
export class AcademyController {
  constructor(private readonly academy: AcademyService) {}

  @Get('cohorts')
  @RequireCapability('academy.read')
  listCohorts(@CurrentAuth() auth: AuthContext, @Query('module_code') moduleCode?: string) {
    const validModule = ModuleCodeEnum.safeParse(moduleCode).data as AcademyModuleCode | undefined;
    return this.academy.listCohorts(auth, validModule);
  }

  @Post('cohorts')
  @RequireCapability('academy.manage')
  createCohort(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodBody(CreateCohortBody)) body: z.infer<typeof CreateCohortBody>,
  ) {
    return this.academy.createCohort(auth, body);
  }

  @Post('cohorts/:cohortId/teachers')
  @RequireCapability('academy.manage')
  @HttpCode(200)
  assignTeachers(
    @CurrentAuth() auth: AuthContext,
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
    @Body(new ZodBody(AssignTeachersBody)) body: z.infer<typeof AssignTeachersBody>,
  ) {
    return this.academy.assignTeachers(auth, cohortId, body.teacher_person_ids);
  }

  @Post('cohorts/:cohortId/enrollments')
  @RequireCapability('academy.manage')
  enrollStudent(
    @CurrentAuth() auth: AuthContext,
    @Param('cohortId', ParseUUIDPipe) cohortId: string,
    @Body(new ZodBody(EnrollStudentBody)) body: z.infer<typeof EnrollStudentBody>,
  ) {
    return this.academy.enrollStudent(auth, cohortId, body);
  }

  @Patch('enrollments/:enrollmentId/sessions')
  @RequireCapability('academy.read')
  recordSessions(
    @CurrentAuth() auth: AuthContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body(new ZodBody(SessionProgressBody)) body: z.infer<typeof SessionProgressBody>,
  ) {
    return this.academy.recordSessionProgress(auth, enrollmentId, body);
  }

  @Patch('enrollments/:enrollmentId/grades')
  @RequireCapability('academy.read')
  recordGrades(
    @CurrentAuth() auth: AuthContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body(new ZodBody(RubricGradesBody)) body: z.infer<typeof RubricGradesBody>,
  ) {
    return this.academy.recordRubricGrades(auth, enrollmentId, body);
  }

  @Post('enrollments/:enrollmentId/makeup')
  @RequireCapability('academy.manage')
  @HttpCode(200)
  decideMakeup(
    @CurrentAuth() auth: AuthContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body(new ZodBody(MakeupDecisionBody)) body: z.infer<typeof MakeupDecisionBody>,
  ) {
    return this.academy.decideMakeup(auth, enrollmentId, body);
  }

  @Post('enrollments/:enrollmentId/withdraw')
  @RequireCapability('academy.manage')
  @HttpCode(200)
  withdraw(
    @CurrentAuth() auth: AuthContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body(new ZodBody(WithdrawEnrollmentBody)) body: z.infer<typeof WithdrawEnrollmentBody>,
  ) {
    return this.academy.withdrawEnrollment(auth, enrollmentId, body.reason);
  }

  @Post('enrollments/:enrollmentId/graduate')
  @RequireCapability('academy.manage')
  @HttpCode(200)
  graduate(
    @CurrentAuth() auth: AuthContext,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ) {
    return this.academy.graduateEnrollment(auth, enrollmentId);
  }

  @Get('my-classes')
  @RequireCapability('self.journey.read')
  myClasses(@CurrentAuth() auth: AuthContext) {
    return this.academy.listMyClasses(auth);
  }

  @Post('journey/overrides')
  @RequireCapability('academy.manage')
  overrideStanding(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodBody(StandingOverrideBody)) body: z.infer<typeof StandingOverrideBody>,
  ) {
    return this.academy.recordStandingOverride(auth, body);
  }

  @Get('journey/:personId')
  @RequireCapability('self.journey.read')
  personJourney(
    @CurrentAuth() auth: AuthContext,
    @Param('personId', ParseUUIDPipe) personId: string,
  ) {
    return this.academy.getPersonJourneyTimeline(auth, personId);
  }
}
