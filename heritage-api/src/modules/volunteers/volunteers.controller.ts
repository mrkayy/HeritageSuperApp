import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import type { VolunteerApplicationStatus } from '../../generated/prisma/client.js';
import { ZodBody } from '../../platform/http/errors.js';
import { CurrentAuth, RequireCapability, type AuthContext } from '../identity/auth.guard.js';
import { VolunteersService } from './volunteers.service.js';

const SubmitPreferencesBody = z.object({
  primary_department: z.string().trim().min(1, 'Primary department is required').max(100),
  secondary_department: z.string().trim().min(1, 'Secondary department is required').max(100),
  skills: z.string().trim().max(500).optional(),
  availability: z.string().trim().max(200).optional(),
  idempotency_key: z.string().trim().max(128).optional(),
});

const PlaceProbationaryBody = z.object({
  placed_department: z.string().trim().min(1, 'Placed department is required').max(100),
  review_notes: z.string().trim().max(500).optional(),
});

const CompleteProbationBody = z.object({
  completion_notes: z.string().trim().max(500).optional(),
});

@Controller('volunteers')
export class VolunteersController {
  constructor(private readonly volunteers: VolunteersService) {}

  @Get('status')
  @RequireCapability('volunteers.apply')
  status(@CurrentAuth() auth: AuthContext, @Query('person_id') personId?: string) {
    return this.volunteers.getVolunteerStatus(auth, personId);
  }

  @Post('preferences')
  @RequireCapability('volunteers.apply')
  @HttpCode(200)
  submitPreferences(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodBody(SubmitPreferencesBody)) body: z.infer<typeof SubmitPreferencesBody>,
  ) {
    return this.volunteers.submitPreferences(auth, body);
  }

  @Get('applications')
  @RequireCapability('volunteers.manage')
  listApplications(
    @CurrentAuth() auth: AuthContext,
    @Query('status') status?: string,
  ) {
    return this.volunteers.listApplications(auth, status as VolunteerApplicationStatus | undefined);
  }

  @Post('applications/:applicationId/place-probationary')
  @RequireCapability('volunteers.manage')
  @HttpCode(200)
  placeProbationary(
    @CurrentAuth() auth: AuthContext,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body(new ZodBody(PlaceProbationaryBody)) body: z.infer<typeof PlaceProbationaryBody>,
  ) {
    return this.volunteers.placeProbationary(auth, applicationId, body);
  }

  @Post('applications/:applicationId/complete-probation')
  @RequireCapability('volunteers.manage')
  @HttpCode(200)
  completeProbation(
    @CurrentAuth() auth: AuthContext,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body(new ZodBody(CompleteProbationBody)) body: z.infer<typeof CompleteProbationBody>,
  ) {
    return this.volunteers.completeProbation(auth, applicationId, body);
  }
}
