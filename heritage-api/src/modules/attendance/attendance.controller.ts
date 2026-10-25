import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { ZodBody } from '../../platform/http/errors.js';
import { CurrentAuth, RequireCapability, type AuthContext } from '../identity/auth.guard.js';
import { AttendanceService } from './attendance.service.js';

const ServiceKindEnum = z.enum(['SUNDAY_FIRST', 'SUNDAY_SECOND', 'SUNDAY_COMBINED', 'MIDWEEK', 'SPECIAL']);

const CreateOccurrenceBody = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  kind: ServiceKindEnum,
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  headcount: z.coerce.number().int().min(0).optional(),
  notes: z.string().trim().max(500).optional(),
});

const UpdateHeadcountBody = z.object({
  headcount: z.coerce.number().int().min(0, 'Headcount cannot be negative'),
  notes: z.string().trim().max(500).nullish(),
});

const CheckInBody = z.object({
  person_id: z.string().uuid('Select a valid person'),
});

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get('summary')
  summary() {
    return this.attendance.getDashboardSummary();
  }

  @Get('occurrences')
  @RequireCapability('people.read')
  listOccurrences() {
    return this.attendance.listOccurrences();
  }

  @Post('occurrences')
  @RequireCapability('attendance.record')
  createOccurrence(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodBody(CreateOccurrenceBody)) body: z.infer<typeof CreateOccurrenceBody>,
  ) {
    return this.attendance.createOccurrence(auth, body);
  }

  @Get('occurrences/:occurrenceId')
  @RequireCapability('people.read')
  getRoster(@Param('occurrenceId', ParseUUIDPipe) occurrenceId: string) {
    return this.attendance.getOccurrenceRoster(occurrenceId);
  }

  @Patch('occurrences/:occurrenceId')
  @RequireCapability('attendance.record')
  updateHeadcount(
    @CurrentAuth() auth: AuthContext,
    @Param('occurrenceId', ParseUUIDPipe) occurrenceId: string,
    @Body(new ZodBody(UpdateHeadcountBody)) body: z.infer<typeof UpdateHeadcountBody>,
  ) {
    return this.attendance.updateOccurrenceHeadcount(auth, occurrenceId, body.headcount, body.notes);
  }

  @Post('occurrences/:occurrenceId/check-ins')
  @RequireCapability('attendance.record')
  @HttpCode(200)
  checkIn(
    @CurrentAuth() auth: AuthContext,
    @Param('occurrenceId', ParseUUIDPipe) occurrenceId: string,
    @Body(new ZodBody(CheckInBody)) body: z.infer<typeof CheckInBody>,
  ) {
    return this.attendance.checkInPerson(auth, occurrenceId, body.person_id);
  }

  @Delete('occurrences/:occurrenceId/check-ins/:personId')
  @RequireCapability('attendance.record')
  removeCheckIn(
    @CurrentAuth() auth: AuthContext,
    @Param('occurrenceId', ParseUUIDPipe) occurrenceId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @Query('reason') reason?: string,
  ) {
    return this.attendance.removeCheckIn(auth, occurrenceId, personId, reason);
  }
}
