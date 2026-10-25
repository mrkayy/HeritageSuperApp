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
      return {
        attendance_id: existing.id,
        person_id: personId,
        already_present: true,
      };
    }

    try {
      const record = await this.prisma.attendanceRecord.create({
        data: {
          serviceOccurrenceId: occurrenceId,
          personId,
          source: 'check_in',
          isFirstVisit: false,
          recordedById: actor.personId,
        },
      });
      await this.audit.record({
        action: 'attendance.checked_in',
        actorId: actor.personId,
        subjectId: personId,
        metadata: { serviceOccurrenceId: occurrenceId },
      });
      return {
        attendance_id: record.id,
        person_id: personId,
        already_present: false,
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
        return {
          attendance_id: raced.id,
          person_id: personId,
          already_present: true,
        };
      }
      throw err;
    }
  }

  /**
   * Audited attendance removal when someone was checked in by mistake (HOF-014-S03).
   */
  async removeCheckIn(actor: AuthContext, occurrenceId: string, personId: string, reason?: string) {
    await this.prisma.attendanceRecord.deleteMany({
      where: { serviceOccurrenceId: occurrenceId, personId },
    });
    await this.audit.record({
      action: 'attendance.removed',
      actorId: actor.personId,
      subjectId: personId,
      metadata: { serviceOccurrenceId: occurrenceId, reason: reason ?? 'corrected' },
    });
    return { ok: true };
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
