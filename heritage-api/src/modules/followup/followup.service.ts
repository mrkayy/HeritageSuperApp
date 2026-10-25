import { HttpStatus, Injectable } from '@nestjs/common';
import type { CallOutcome, FollowUpTaskStatus, Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../platform/audit/audit.module.js';
import { PrismaService } from '../../platform/database/prisma.module.js';
import { ApiError } from '../../platform/http/errors.js';
import type { AuthContext } from '../identity/auth.guard.js';

export interface FollowUpQueueFilter {
  scope?: 'mine' | 'unassigned' | 'all' | 'pastoral';
  status?: FollowUpTaskStatus;
}

export interface LogCallOutcomeInput {
  outcome: CallOutcome;
  note?: string;
  needs_pastoral_visit?: boolean;
  next_action_at?: string;
  mark_completed?: boolean;
}

@Injectable()
export class FollowUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Lists follow-up tasks (HOF-016-S01 / S03).
   * - Callers without `followups.assign` only see tasks currently assigned to them
   *   (or unassigned if they pick one up), enforcing live access boundaries on reassignment (HOF-016-S03).
   * - Leads, Pastors, and Admins with `followups.assign` can view `all` and `unassigned` queues.
   */
  async listQueue(actor: AuthContext, filter: FollowUpQueueFilter) {
    const canAssignAll = actor.grants.some((g) => g.capability === 'followups.assign');
    const where: Prisma.FollowUpTaskWhereInput = {};

    if (filter.status) {
      where.status = filter.status;
    } else {
      where.status = { in: ['OPEN', 'IN_PROGRESS'] };
    }

    const requestedScope = filter.scope ?? (canAssignAll ? 'all' : 'mine');

    if (requestedScope === 'mine' || !canAssignAll) {
      where.assigneePersonId = actor.personId;
    } else if (requestedScope === 'unassigned') {
      where.assigneePersonId = null;
    } else if (requestedScope === 'pastoral') {
      where.needsPastoralVisit = true;
    }

    const tasks = await this.prisma.followUpTask.findMany({
      where,
      orderBy: [{ needsPastoralVisit: 'desc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 150,
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            address: true,
            missingContactReason: true,
            membershipStatus: true,
            foundationClassStatus: true,
          },
        },
        serviceOccurrence: {
          select: { id: true, title: true, serviceDate: true },
        },
        callLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    // Resolve assignee names in one batch query
    const assigneeIds = [...new Set(tasks.map((t) => t.assigneePersonId).filter((id): id is string => Boolean(id)))];
    const assignees = assigneeIds.length
      ? await this.prisma.person.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const assigneeMap = new Map(assignees.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));

    return tasks.map((t) => ({
      id: t.id,
      status: t.status,
      last_outcome: t.lastOutcome,
      needs_pastoral_visit: t.needsPastoralVisit,
      due_at: t.dueAt?.toISOString() ?? null,
      next_action_at: t.nextActionAt?.toISOString() ?? null,
      completed_at: t.completedAt?.toISOString() ?? null,
      assignee_person_id: t.assigneePersonId,
      assignee_name: t.assigneePersonId ? (assigneeMap.get(t.assigneePersonId) ?? 'Steward') : null,
      person: {
        id: t.person.id,
        first_name: t.person.firstName,
        last_name: t.person.lastName,
        phone: t.person.phone,
        email: t.person.email,
        address: t.person.address,
        missing_contact_reason: t.person.missingContactReason,
        membership_status: t.person.membershipStatus,
        foundation_class_status: t.person.foundationClassStatus,
      },
      service_occurrence: t.serviceOccurrence
        ? {
            id: t.serviceOccurrence.id,
            title: t.serviceOccurrence.title,
            service_date: t.serviceOccurrence.serviceDate.toISOString(),
          }
        : null,
      call_logs: t.callLogs.map((c) => ({
        id: c.id,
        outcome: c.outcome,
        note: c.note,
        needs_pastoral_visit: c.needsPastoralVisit,
        next_action_at: c.nextActionAt?.toISOString() ?? null,
        created_at: c.createdAt.toISOString(),
      })),
    }));
  }

  /**
   * List active stewards who can be assigned follow-up calls.
   */
  async listCallers() {
    const stewards = await this.prisma.person.findMany({
      where: {
        account: { status: 'ACTIVE' },
        assignments: { some: { endedAt: null } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        assignments: {
          where: { endedAt: null },
          select: { role: true, team: { select: { name: true } } },
        },
      },
    });
    return stewards.map((s) => ({
      person_id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      roles: s.assignments.map((a) => (a.team ? `${a.role} (${a.team.name})` : a.role)),
    }));
  }

  /**
   * Assign or reassign a follow-up task to a steward (HOF-016-S01 / S03).
   */
  async assignTask(actor: AuthContext, taskId: string, assigneePersonId: string, dueAt?: string) {
    const task = await this.prisma.followUpTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'TASK_NOT_FOUND', 'Follow-up task not found.');
    }

    const assignee = await this.prisma.person.findUnique({
      where: { id: assigneePersonId },
      include: { assignments: { where: { endedAt: null } } },
    });
    if (!assignee || assignee.assignments.length === 0) {
      throw new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, 'INVALID_ASSIGNEE', 'Choose an active steward.');
    }

    const updated = await this.prisma.followUpTask.update({
      where: { id: taskId },
      data: {
        assigneePersonId,
        assignedById: actor.personId,
        assignedAt: new Date(),
        dueAt: dueAt ? new Date(dueAt) : task.dueAt,
      },
    });

    await this.audit.record({
      action: 'followups.assigned',
      actorId: actor.personId,
      subjectId: taskId,
      metadata: { assigneePersonId, personId: task.personId },
    });

    return { id: updated.id, assignee_person_id: updated.assigneePersonId };
  }

  /**
   * Record a call attempt & outcome (HOF-016-S02):
   * - Honest outcome logging: UNREACHABLE / VOICEMAIL / WRONG_NUMBER keep the task IN_PROGRESS
   *   rather than falsely marking the visitor as reached/completed.
   * - REACHED / REQUESTED_PRAYER / NEEDS_PASTORAL_VISIT can either keep the task open for
   *   continued care or mark it COMPLETED when the steward chooses `mark_completed: true`.
   */
  async recordOutcome(actor: AuthContext, taskId: string, input: LogCallOutcomeInput) {
    const task = await this.prisma.followUpTask.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'TASK_NOT_FOUND', 'Follow-up task not found.');
    }

    const canAssignAll = actor.grants.some((g) => g.capability === 'followups.assign');
    if (!canAssignAll && task.assigneePersonId && task.assigneePersonId !== actor.personId) {
      throw new ApiError(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'This follow-up task is assigned to another steward.');
    }

    const successfulContact =
      input.outcome === 'REACHED' ||
      input.outcome === 'REQUESTED_PRAYER' ||
      input.outcome === 'NEEDS_PASTORAL_VISIT';

    // HOF-016-S02: Failed contact attempts can never mark the task completed
    const shouldComplete = Boolean(input.mark_completed && successfulContact);
    const nextStatus: FollowUpTaskStatus = shouldComplete ? 'COMPLETED' : 'IN_PROGRESS';
    const needsPastoral =
      Boolean(input.needs_pastoral_visit) ||
      input.outcome === 'NEEDS_PASTORAL_VISIT' ||
      task.needsPastoralVisit;
    const nextActionAt = input.next_action_at ? new Date(input.next_action_at) : null;

    const result = await this.prisma.$transaction(async (tx) => {
      const log = await tx.callLog.create({
        data: {
          taskId,
          callerPersonId: actor.personId,
          outcome: input.outcome,
          note: input.note?.trim() || null,
          needsPastoralVisit: Boolean(input.needs_pastoral_visit) || input.outcome === 'NEEDS_PASTORAL_VISIT',
          nextActionAt,
        },
      });

      const updatedTask = await tx.followUpTask.update({
        where: { id: taskId },
        data: {
          assigneePersonId: task.assigneePersonId ?? actor.personId,
          status: nextStatus,
          lastOutcome: input.outcome,
          needsPastoralVisit: needsPastoral,
          nextActionAt,
          completedAt: shouldComplete ? new Date() : null,
        },
      });

      await this.audit.record(
        {
          action: 'followups.outcome_recorded',
          actorId: actor.personId,
          subjectId: taskId,
          metadata: { outcome: input.outcome, status: nextStatus, needsPastoralVisit: needsPastoral },
        },
        tx,
      );

      return { log, updatedTask };
    });

    return {
      task_id: result.updatedTask.id,
      status: result.updatedTask.status,
      last_outcome: result.updatedTask.lastOutcome,
      needs_pastoral_visit: result.updatedTask.needsPastoralVisit,
      call_log_id: result.log.id,
    };
  }
}
