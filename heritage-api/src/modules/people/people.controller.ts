import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
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
  membership_status: MembershipStatusEnum.optional(),
  foundation_class_status: FoundationStatusEnum.optional(),
  birth_month: z.coerce.number().int().min(1).max(12).nullish(),
  birth_day: z.coerce.number().int().min(1).max(31).nullish(),
  anniversary_month: z.coerce.number().int().min(1).max(12).nullish(),
  anniversary_day: z.coerce.number().int().min(1).max(31).nullish(),
});

const UpdatePersonBody = CreatePersonBody.partial();

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
}
