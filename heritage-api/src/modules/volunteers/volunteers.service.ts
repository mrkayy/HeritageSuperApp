import { HttpStatus, Injectable } from '@nestjs/common';
import type { Prisma, VolunteerApplicationStatus } from '../../generated/prisma/client.js';
import { AuditService } from '../../platform/audit/audit.module.js';
import { PrismaService } from '../../platform/database/prisma.module.js';
import { ApiError } from '../../platform/http/errors.js';
import type { AuthContext } from '../identity/auth.guard.js';

export interface SubmitVolunteerPreferencesInput {
  primary_department: string;
  secondary_department: string;
  skills?: string;
  availability?: string;
  idempotency_key?: string;
}

export interface PlaceProbationaryVolunteerInput {
  placed_department: string;
  review_notes?: string;
}

export interface CompleteProbationInput {
  completion_notes?: string;
}

@Injectable()
export class VolunteersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * HOF-021-S01: Check whether a person has unlocked volunteer preferences.
   * Unlocked when a person has completed Module 2 (MEMBERSHIP_201 graduation)
   * or holds a recognized graduation achievement.
   */
  async getVolunteerStatus(actor: AuthContext, personId?: string) {
    const targetPersonId = personId ?? actor.personId;
    const canManage = actor.grants.some((g) => g.capability === 'volunteers.manage');
    if (!canManage && targetPersonId !== actor.personId) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Cannot view other member volunteer status.');
    }

    const [person, completedModule2, activeApp] = await Promise.all([
      this.prisma.person.findUnique({ where: { id: targetPersonId } }),
      this.prisma.academyEnrollment.findFirst({
        where: {
          personId: targetPersonId,
          moduleCode: 'MEMBERSHIP_201',
          status: 'GRADUATED',
        },
      }),
      this.prisma.volunteerApplication.findFirst({
        where: { personId: targetPersonId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!person) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PERSON_NOT_FOUND', 'Person not found.');
    }

    const isUnlocked = Boolean(completedModule2) || person.membershipStatus === 'MEMBER' || person.membershipStatus === 'WORK_FORCE';

    return {
      person_id: targetPersonId,
      first_name: person.firstName,
      last_name: person.lastName,
      membership_status: person.membershipStatus,
      is_unlocked: isUnlocked,
      module_2_completed: Boolean(completedModule2),
      active_application: activeApp
        ? {
            id: activeApp.id,
            primary_department: activeApp.primaryDepartment,
            secondary_department: activeApp.secondaryDepartment,
            skills: activeApp.skills,
            availability: activeApp.availability,
            status: activeApp.status,
            placed_department: activeApp.placedDepartment,
            probation_started_at: activeApp.probationStartedAt?.toISOString() ?? null,
            probation_ended_at: activeApp.probationEndedAt?.toISOString() ?? null,
            created_at: activeApp.createdAt.toISOString(),
          }
        : null,
    };
  }

  /**
   * HOF-021-S01: Member ranks 2 departments, enters skills and availability.
   * Processed repeatedly/idempotently: returns the single active application task.
   */
  async submitPreferences(actor: AuthContext, input: SubmitVolunteerPreferencesInput) {
    const personId = actor.personId;
    const status = await this.getVolunteerStatus(actor, personId);
    if (!status.is_unlocked) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'MODULE_2_REQUIRED',
        'You must complete Membership Class (Module 2) before selecting volunteer department preferences.',
      );
    }

    if (input.primary_department.trim().toLowerCase() === input.secondary_department.trim().toLowerCase()) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'DISTINCT_DEPARTMENTS_REQUIRED',
        'Primary and secondary department preferences must be different.',
      );
    }

    const idempotencyKey = input.idempotency_key?.trim() || `vol-app-${personId}`;

    const app = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.volunteerApplication.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return { application: existing, replayed: true };
      }

      const created = await tx.volunteerApplication.create({
        data: {
          personId,
          primaryDepartment: input.primary_department.trim(),
          secondaryDepartment: input.secondary_department.trim(),
          skills: input.skills?.trim() || null,
          availability: input.availability?.trim() || null,
          status: 'SUBMITTED',
          idempotencyKey,
        },
      });

      await this.audit.record(
        {
          action: 'volunteers.application.submitted',
          actorId: actor.personId,
          subjectId: created.id,
          metadata: {
            personId,
            primaryDepartment: created.primaryDepartment,
            secondaryDepartment: created.secondaryDepartment,
          },
        },
        tx,
      );

      return { application: created, replayed: false };
    });

    return {
      id: app.application.id,
      person_id: app.application.personId,
      primary_department: app.application.primaryDepartment,
      secondary_department: app.application.secondaryDepartment,
      status: app.application.status,
      replayed: app.replayed,
      created_at: app.application.createdAt.toISOString(),
    };
  }

  /**
   * List volunteer applications for Membership reviewers.
   */
  async listApplications(actor: AuthContext, statusFilter?: VolunteerApplicationStatus) {
    const applications = await this.prisma.volunteerApplication.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            membershipStatus: true,
            foundationClassStatus: true,
          },
        },
      },
    });

    return applications.map((a) => ({
      id: a.id,
      person_id: a.personId,
      primary_department: a.primaryDepartment,
      secondary_department: a.secondaryDepartment,
      skills: a.skills,
      availability: a.availability,
      status: a.status,
      placed_department: a.placedDepartment,
      probation_started_at: a.probationStartedAt?.toISOString() ?? null,
      probation_ended_at: a.probationEndedAt?.toISOString() ?? null,
      review_notes: a.reviewNotes,
      created_at: a.createdAt.toISOString(),
      person: a.person,
    }));
  }

  /**
   * HOF-021-S02: Membership approves probationary placement in a department (e.g. Choir).
   * - Records probationary status and department.
   * - Does NOT grant arbitrary admin elevation: volunteer receives only explicit baseline capabilities.
   */
  async placeProbationary(actor: AuthContext, applicationId: string, input: PlaceProbationaryVolunteerInput) {
    const app = await this.prisma.volunteerApplication.findUnique({
      where: { id: applicationId },
      include: { person: true },
    });
    if (!app) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', 'Volunteer application not found.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const placed = await tx.volunteerApplication.update({
        where: { id: applicationId },
        data: {
          status: 'PROBATIONARY',
          placedDepartment: input.placed_department.trim(),
          probationStartedAt: new Date(),
          reviewedById: actor.personId,
          reviewedAt: new Date(),
          reviewNotes: input.review_notes?.trim() || null,
        },
        include: { person: true },
      });

      await this.audit.record(
        {
          action: 'volunteers.probation.placed',
          actorId: actor.personId,
          subjectId: applicationId,
          metadata: {
            personId: placed.personId,
            placedDepartment: placed.placedDepartment,
            reviewedById: actor.personId,
          },
        },
        tx,
      );

      return placed;
    });

    return {
      id: updated.id,
      person_id: updated.personId,
      status: updated.status,
      placed_department: updated.placedDepartment,
      probation_started_at: updated.probationStartedAt?.toISOString() ?? null,
    };
  }

  /**
   * HOF-021-S03: Membership graduation updates service standing to full steward / WORK_FORCE.
   * - Full-steward standing is recorded once.
   * - Appointment change is independently auditable rather than an unrestricted role elevation.
   */
  async completeProbation(actor: AuthContext, applicationId: string, input: CompleteProbationInput) {
    const app = await this.prisma.volunteerApplication.findUnique({
      where: { id: applicationId },
      include: { person: true },
    });
    if (!app) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'APPLICATION_NOT_FOUND', 'Volunteer application not found.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedApp = await tx.volunteerApplication.update({
        where: { id: applicationId },
        data: {
          status: 'PLACED',
          probationEndedAt: new Date(),
          placedAt: new Date(),
          reviewNotes: input.completion_notes ? `${app.reviewNotes ?? ''}\nCompleted: ${input.completion_notes.trim()}`.trim() : app.reviewNotes,
        },
      });

      // Update person standing to WORK_FORCE once
      const prevStatus = app.person.membershipStatus;
      await tx.person.update({
        where: { id: app.personId },
        data: {
          membershipStatus: 'WORK_FORCE',
          version: { increment: 1 },
        },
      });

      await tx.journeyTransition.create({
        data: {
          personId: app.personId,
          fromStatus: prevStatus,
          toStatus: 'WORK_FORCE',
          fromFoundationStatus: app.person.foundationClassStatus,
          toFoundationStatus: app.person.foundationClassStatus,
          ruleVersion: 'v1:volunteer_placement_probation',
          isOverride: false,
          reason: `Completed volunteer probation in ${app.placedDepartment ?? 'department'} and elevated to full WORK_FORCE standing.`,
          evidence: {
            applicationId: app.id,
            placedDepartment: app.placedDepartment,
            notes: input.completion_notes?.trim() || null,
          },
          actorPersonId: actor.personId,
        },
      });

      await this.audit.record(
        {
          action: 'volunteers.probation.completed',
          actorId: actor.personId,
          subjectId: applicationId,
          metadata: {
            personId: app.personId,
            placedDepartment: app.placedDepartment,
            newStanding: 'WORK_FORCE',
          },
        },
        tx,
      );

      return { updatedApp, newStanding: 'WORK_FORCE' as const };
    });

    return {
      id: result.updatedApp.id,
      person_id: app.personId,
      status: result.updatedApp.status,
      membership_status: result.newStanding,
      placed_department: result.updatedApp.placedDepartment,
      placed_at: result.updatedApp.placedAt?.toISOString() ?? null,
    };
  }
}
