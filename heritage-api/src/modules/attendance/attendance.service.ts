import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, type ServiceKind } from '../../generated/prisma/client.js';
import { AuditService } from '../../platform/audit/audit.module.js';
import { PrismaService } from '../../platform/database/prisma.module.js';
import { ApiError } from '../../platform/http/errors.js';
import type { AuthContext } from '../identity/auth.guard.js';

export interface CreateOccurrenceInput {
  title: string;
  kind: ServiceKind;
  service_date: string; // YYYY-MM-DD
  headcount?: number;
  notes?: string;
}

export const FOUNDATION_ELIGIBILITY_RULE_VERSION = 'v1:2_visits';
export const FOUNDATION_QUALIFYING_VISIT_THRESHOLD = 2;

/**
 * HOF-015-S01 / S03: Synchronizes a Person's Foundation eligibility based on live
 * distinct qualifying service attendance count.
 * - Threshold (>= 2 visits) records `foundationEligibleAt` and `foundationRuleVersion`
 *   ONLY — it never creates an Account, never enrolls the person in Foundation Class,
 *   and never marks Foundation Class completed (`HOF-015-S01`).
 * - If attendance is later corrected/removed so qualifying visits drop below 2,
 *   clears stale eligibility (`HOF-015-S03`).
 */
export async function syncFoundationEligibility(
  tx: Prisma.TransactionClient,
  personId: string,
): Promise<{
  qualifyingVisitsCount: number;
  isEligible: boolean;
  foundationEligibleAt: Date | null;
  foundationRuleVersion: string | null;
}> {
  const [person, qualifyingVisitsCount] = await Promise.all([
    tx.person.findUnique({
      where: { id: personId },
      select: {
        id: true,
        foundationEligibleAt: true,
        foundationRuleVersion: true,
      },
    }),
    tx.attendanceRecord.count({ where: { personId } }),
  ]);

  if (!person) {
    return {
      qualifyingVisitsCount: 0,
      isEligible: false,
      foundationEligibleAt: null,
      foundationRuleVersion: null,
    };
  }

  if (qualifyingVisitsCount >= FOUNDATION_QUALIFYING_VISIT_THRESHOLD) {
    const eligibleAt = person.foundationEligibleAt ?? new Date();
    const ruleVersion = person.foundationRuleVersion ?? FOUNDATION_ELIGIBILITY_RULE_VERSION;
    if (!person.foundationEligibleAt || person.foundationRuleVersion !== ruleVersion) {
      await tx.person.update({
        where: { id: personId },
        data: {
          foundationEligibleAt: eligibleAt,
          foundationRuleVersion: ruleVersion,
        },
      });
    }
    return {
      qualifyingVisitsCount,
      isEligible: true,
      foundationEligibleAt: eligibleAt,
      foundationRuleVersion: ruleVersion,
    };
  }

  if (person.foundationEligibleAt || person.foundationRuleVersion) {
    await tx.person.update({
      where: { id: personId },
      data: {
        foundationEligibleAt: null,
        foundationRuleVersion: null,
      },
    });
  }

  return {
    qualifyingVisitsCount,
    isEligible: false,
    foundationEligibleAt: null,
    foundationRuleVersion: null,
  };
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listOccurrences() {
    const occurrences = await this.prisma.serviceOccurrence.findMany({
      orderBy: [{ serviceDate: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        _count: { select: { attendanceRecords: true } },
        attendanceRecords: {
          where: { isFirstVisit: true },
          select: { id: true },
        },
      },
    });

    return occurrences.map((o) => ({
      id: o.id,
      title: o.title,
      kind: o.kind,
      service_date: o.serviceDate.toISOString().slice(0, 10),
      headcount: o.headcount,
      check_in_count: o._count.attendanceRecords,
      first_timer_count: o.attendanceRecords.length,
      notes: o.notes,
    }));
  }

  async createOccurrence(actor: AuthContext, input: CreateOccurrenceInput) {
    const serviceDate = parseUtcDate(input.service_date);
    try {
      const created = await this.prisma.serviceOccurrence.create({
        data: {
          title: input.title.trim(),
          kind: input.kind,
          serviceDate,
          headcount: input.headcount ?? 0,
          notes: input.notes?.trim() || null,
          createdById: actor.personId,
        },
      });
      await this.audit.record({
        action: 'attendance.occurrence.created',
        actorId: actor.personId,
        subjectId: created.id,
        metadata: { kind: created.kind, serviceDate: input.service_date },
      });
      return {
        id: created.id,
        title: created.title,
        kind: created.kind,
        service_date: created.serviceDate.toISOString().slice(0, 10),
        headcount: created.headcount,
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ApiError(
          HttpStatus.CONFLICT,
          'OCCURRENCE_EXISTS',
          'A service of this kind already exists for that date.',
        );
      }
      throw err;
    }
  }

  async updateOccurrenceHeadcount(
    actor: AuthContext,
    occurrenceId: string,
    headcount: number,
    notes?: string | null,
  ) {
    const existing = await this.prisma.serviceOccurrence.findUnique({ where: { id: occurrenceId } });
    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'OCCURRENCE_NOT_FOUND', 'Service occurrence not found.');
    }
    const updated = await this.prisma.serviceOccurrence.update({
      where: { id: occurrenceId },
      data: {
        headcount,
        notes: notes !== undefined ? notes?.trim() || null : existing.notes,
      },
    });
    await this.audit.record({
      action: 'attendance.headcount.updated',
      actorId: actor.personId,
      subjectId: occurrenceId,
      metadata: { headcount },
    });
    return {
      id: updated.id,
      headcount: updated.headcount,
      notes: updated.notes,
    };
  }

  async getOccurrenceRoster(occurrenceId: string) {
    const occurrence = await this.prisma.serviceOccurrence.findUnique({
      where: { id: occurrenceId },
      include: {
        attendanceRecords: {
          orderBy: { createdAt: 'desc' },
          include: {
            person: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                membershipStatus: true,
                foundationClassStatus: true,
              },
            },
          },
        },
      },
    });
    if (!occurrence) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'OCCURRENCE_NOT_FOUND', 'Service occurrence not found.');
    }

    return {
      id: occurrence.id,
      title: occurrence.title,
      kind: occurrence.kind,
      service_date: occurrence.serviceDate.toISOString().slice(0, 10),
      headcount: occurrence.headcount,
      notes: occurrence.notes,
      attendees: occurrence.attendanceRecords.map((r) => ({
        attendance_id: r.id,
        person_id: r.person.id,
        first_name: r.person.firstName,
        last_name: r.person.lastName,
        phone: r.person.phone,
        membership_status: r.person.membershipStatus,
        foundation_class_status: r.person.foundationClassStatus,
        is_first_visit: r.isFirstVisit,
        source: r.source,
        checked_in_at: r.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Idempotent individual check-in (HOF-014-S01):
   * Concurrent check-ins for the same (serviceOccurrenceId, personId) never create duplicates
   * and return `already_present: true` when replayed.
   */
  async checkInPerson(actor: AuthContext, occurrenceId: string, personId: string) {
    const [occurrence, person] = await Promise.all([
      this.prisma.serviceOccurrence.findUnique({ where: { id: occurrenceId } }),
      this.prisma.person.findUnique({ where: { id: personId } }),
    ]);
    if (!occurrence) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'OCCURRENCE_NOT_FOUND', 'Service occurrence not found.');
    }
    if (!person) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PERSON_NOT_FOUND', 'Person not found.');
    }

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        serviceOccurrenceId_personId: {
          serviceOccurrenceId: occurrenceId,
          personId,
        },
      },
    });

    if (existing) {
      const eligibility = await this.prisma.$transaction((tx) => syncFoundationEligibility(tx, personId));
      return {
        attendance_id: existing.id,
        person_id: personId,
        already_present: true,
        qualifying_visits_count: eligibility.qualifyingVisitsCount,
        foundation_eligible: eligibility.isEligible,
        foundation_rule_version: eligibility.foundationRuleVersion,
      };
    }

    try {
      const { record, eligibility } = await this.prisma.$transaction(async (tx) => {
        const rec = await tx.attendanceRecord.create({
          data: {
            serviceOccurrenceId: occurrenceId,
            personId,
            source: 'check_in',
            isFirstVisit: false,
            recordedById: actor.personId,
          },
        });
        const elig = await syncFoundationEligibility(tx, personId);
        await this.audit.record(
          {
            action: 'attendance.checked_in',
            actorId: actor.personId,
            subjectId: personId,
            metadata: {
              serviceOccurrenceId: occurrenceId,
              qualifyingVisitsCount: elig.qualifyingVisitsCount,
              foundationEligible: elig.isEligible,
              foundationRuleVersion: elig.foundationRuleVersion,
            },
          },
          tx,
        );
        return { record: rec, eligibility: elig };
      });
      return {
        attendance_id: record.id,
        person_id: personId,
        already_present: false,
        qualifying_visits_count: eligibility.qualifyingVisitsCount,
        foundation_eligible: eligibility.isEligible,
        foundation_rule_version: eligibility.foundationRuleVersion,
      };
    } catch (err) {
      // Handle concurrent race on unique constraint (HOF-014-S01)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const raced = await this.prisma.attendanceRecord.findUniqueOrThrow({
          where: {
            serviceOccurrenceId_personId: {
              serviceOccurrenceId: occurrenceId,
              personId,
            },
          },
        });
        const eligibility = await this.prisma.$transaction((tx) => syncFoundationEligibility(tx, personId));
        return {
          attendance_id: raced.id,
          person_id: personId,
          already_present: true,
          qualifying_visits_count: eligibility.qualifyingVisitsCount,
          foundation_eligible: eligibility.isEligible,
          foundation_rule_version: eligibility.foundationRuleVersion,
        };
      }
      throw err;
    }
  }

  /**
   * Audited attendance removal when someone was checked in by mistake (HOF-014-S03 / HOF-015-S03).
   * Re-evaluates Foundation eligibility so stale eligibility is cleared if visits drop below threshold.
   */
  async removeCheckIn(actor: AuthContext, occurrenceId: string, personId: string, reason?: string) {
    const eligibility = await this.prisma.$transaction(async (tx) => {
      await tx.attendanceRecord.deleteMany({
        where: { serviceOccurrenceId: occurrenceId, personId },
      });
      const elig = await syncFoundationEligibility(tx, personId);
      await this.audit.record(
        {
          action: 'attendance.removed',
          actorId: actor.personId,
          subjectId: personId,
          metadata: {
            serviceOccurrenceId: occurrenceId,
            reason: reason ?? 'corrected',
            qualifyingVisitsCount: elig.qualifyingVisitsCount,
            foundationEligible: elig.isEligible,
          },
        },
        tx,
      );
      return elig;
    });
    return {
      ok: true,
      qualifying_visits_count: eligibility.qualifyingVisitsCount,
      foundation_eligible: eligibility.isEligible,
    };
  }

  /**
   * Single Command Center summary metrics for `/dashboard`.
   */
  async getDashboardSummary() {
    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;

    const [
      totalPeople,
      firstTimersCount,
      openFollowUpsCount,
      pastoralAlertsCount,
      activeStewardsCount,
      latestService,
      celebrationsCount,
    ] = await Promise.all([
      this.prisma.person.count(),
      this.prisma.person.count({ where: { membershipStatus: 'FIRST_TIMER' } }),
      this.prisma.followUpTask.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      this.prisma.followUpTask.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, needsPastoralVisit: true },
      }),
      this.prisma.account.count({ where: { status: 'ACTIVE' } }),
      this.prisma.serviceOccurrence.findFirst({
        orderBy: [{ serviceDate: 'desc' }, { createdAt: 'desc' }],
        include: { _count: { select: { attendanceRecords: true } } },
      }),
      this.prisma.person.count({
        where: { OR: [{ birthMonth: currentMonth }, { anniversaryMonth: currentMonth }] },
      }),
    ]);

    return {
      total_people: totalPeople,
      first_timers_count: firstTimersCount,
      open_followups_count: openFollowUpsCount,
      pastoral_alerts_count: pastoralAlertsCount,
      active_stewards_count: activeStewardsCount,
      celebrations_this_month: celebrationsCount,
      latest_service: latestService
        ? {
            id: latestService.id,
            title: latestService.title,
            service_date: latestService.serviceDate.toISOString().slice(0, 10),
            headcount: Math.max(latestService.headcount, latestService._count.attendanceRecords),
            check_in_count: latestService._count.attendanceRecords,
          }
        : null,
    };
  }
}

function parseUtcDate(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    throw new ApiError(HttpStatus.BAD_REQUEST, 'INVALID_DATE', 'Use YYYY-MM-DD format.', {
      service_date: 'Use YYYY-MM-DD format',
    });
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}
