import { HttpStatus, Injectable } from '@nestjs/common';
import {
  Prisma,
  type AcademyCohortStatus,
  type AcademyEnrollmentStatus,
  type AcademyModuleCode,
  type FoundationClassStatus,
  type MembershipStatus,
  type SundaySchoolStatus,
} from '../../generated/prisma/client.js';
import { AuditService } from '../../platform/audit/audit.module.js';
import { PrismaService } from '../../platform/database/prisma.module.js';
import { ApiError } from '../../platform/http/errors.js';
import type { AuthContext } from '../identity/auth.guard.js';

export const DEFAULT_ACADEMY_RULE_VERSION = 'v1:6_sessions_50_pass';

export const MODULE_CURRICULA: Record<AcademyModuleCode, string[]> = {
  FOUNDATION_101: [
    'Session 1: Salvation & New Creation Realities',
    'Session 2: The Word, Prayer & Spiritual Growth',
    'Session 3: The Holy Spirit & Kingdom Living',
    'Session 4: Christian Character, Family & Stewardship',
    'Session 5: The Local Church & Heritage Vision',
    'Session 6: Ministry Service, Covenant & Review',
  ],
  SUNDAY_SCHOOL_101: [
    'Session 1: The Authority of the Scriptures & Sound Doctrine',
    'Session 2: Effective Prayer Life & Fasting',
    'Session 3: Praise, Worship & Spiritual Warfare',
    'Session 4: Walking in Righteousness & Integrity',
    'Session 5: Faith, Grace & Overcoming Life Challenges',
    'Session 6: Evangelism, Soul Winning & Personal Discipleship',
  ],
  SUNDAY_SCHOOL_102: [
    'Session 1: Discovering Your Spiritual Gifts & Talents',
    'Session 2: Biblical Financial Stewardship & Tithing',
    'Session 3: Servant Leadership & Kingdom Mindset',
    'Session 4: Family Life, Relationships & Christian Ethics',
    'Session 5: Ministry Departments & Service in the Church Body',
    'Session 6: Practical Ministry Preparation & Workforce Readiness',
  ],
  SUNDAY_SCHOOL_103: [
    'Session 1: The Great Commission & Global Missions',
    'Session 2: Spiritual Authority & Church Subjection',
    'Session 3: Handling Conflicts & Church Discipline',
    'Session 4: Apologetics & Defending the Faith',
    'Session 5: Leadership Pitfalls & Finishing Well',
    'Session 6: Commissioning & Final Review',
  ],
  MEMBERSHIP_201: [
    'Session 1: Heritage Model Church History & Commission',
    'Session 2: Church Articles of Faith & Ordinances',
    'Session 3: Church Government, Protocols & Accountability',
    'Session 4: Covenant Partnership & Commitment',
    'Session 5: Ministry Commissioning & Pastoral Alignment',
    'Session 6: Graduation & Steward Induction',
  ],
};

export const DEFAULT_SIX_SESSIONS = MODULE_CURRICULA.FOUNDATION_101;

export interface CreateCohortInput {
  module_code?: AcademyModuleCode;
  title: string;
  starts_on: string;
  rule_version?: string;
  notes?: string;
  teacher_person_ids?: string[];
  session_titles?: string[];
}

export interface EnrollStudentInput {
  person_id: string;
  prerequisite_override?: boolean;
  override_reason?: string;
}

export interface RecordSessionProgressInput {
  credited_sessions: number[];
}

export interface RecordRubricGradesInput {
  scores: [number, number, number, number, number, number];
}

export interface ApproveMakeupInput {
  approved: boolean;
  reason: string;
}

export interface OverrideStandingInput {
  person_id: string;
  to_status?: MembershipStatus;
  to_foundation_status?: FoundationClassStatus;
  to_sunday_school_status?: SundaySchoolStatus;
  reason: string;
  rule_version?: string;
  evidence_note?: string;
}

export type GraduationEligibilityState =
  | 'eligible'
  | 'coordinator_makeup_decision_required'
  | 'retake_required'
  | 'score_below_passing'
  | 'incomplete_assessment';

/**
 * HOF-020-S02: Pure evaluation of graduation eligibility from total score (0..100),
 * credited session count (0..6), and coordinator makeup approval.
 */
export function evaluateGraduationEligibility(params: {
  totalScore: number | null;
  creditedSessionCount: number;
  makeupApproved: boolean;
}): GraduationEligibilityState {
  if (params.totalScore === null || params.totalScore === undefined) {
    return 'incomplete_assessment';
  }
  if (params.totalScore < 50) {
    return 'score_below_passing';
  }
  if (params.creditedSessionCount <= 3) {
    return 'retake_required';
  }
  if (params.creditedSessionCount <= 5) {
    return params.makeupApproved ? 'eligible' : 'coordinator_makeup_decision_required';
  }
  return 'eligible';
}

@Injectable()
export class AcademyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Lists cohorts with their 6 scheduled sessions, assigned teachers, and enrollments.
   */
  async listCohorts(actor: AuthContext, moduleCode?: AcademyModuleCode) {
    const cohorts = await this.prisma.academyCohort.findMany({
      where: moduleCode ? { moduleCode } : undefined,
      orderBy: [{ startsOn: 'desc' }, { createdAt: 'desc' }],
      include: {
        sessions: { orderBy: { sessionNumber: 'asc' } },
        teachers: true,
        enrollments: {
          orderBy: { createdAt: 'asc' },
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
                sundaySchoolStatus: true,
                foundationEligibleAt: true,
              },
            },
          },
        },
      },
    });

    const teacherIds = [
      ...new Set(cohorts.flatMap((c) => c.teachers.map((t) => t.teacherPersonId))),
    ];
    const teacherPeople = teacherIds.length
      ? await this.prisma.person.findMany({
          where: { id: { in: teacherIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const teacherMap = new Map(
      teacherPeople.map((p) => [p.id, `${p.firstName} ${p.lastName}`]),
    );

    const hasManageOrGradeGrant = actor.grants.some(
      (g) => g.capability === 'academy.manage' || g.capability === 'academy.grade',
    );

    return cohorts.map((c) => {
      const isAssignedTeacher = c.teachers.some((t) => t.teacherPersonId === actor.personId);
      return {
        id: c.id,
        module_code: c.moduleCode,
        title: c.title,
        rule_version: c.ruleVersion,
        starts_on: c.startsOn,
        status: c.status,
        notes: c.notes,
        can_caller_grade: hasManageOrGradeGrant || isAssignedTeacher,
        sessions: c.sessions.map((s) => ({
          id: s.id,
          session_number: s.sessionNumber,
          title: s.title,
          scheduled_on: s.scheduledOn,
        })),
        teachers: c.teachers.map((t) => ({
          id: t.id,
          person_id: t.teacherPersonId,
          name: teacherMap.get(t.teacherPersonId) ?? 'Teacher',
        })),
        enrollments: c.enrollments.map((e) => formatEnrollmentItem(e)),
      };
    });
  }

  /**
   * HOF-019-S01: Coordinator schedules a cohort, six sessions, and teacher assignments.
   */
  async createCohort(actor: AuthContext, input: CreateCohortInput) {
    const moduleCode: AcademyModuleCode = input.module_code ?? 'FOUNDATION_101';
    const ruleVersion = input.rule_version?.trim() || DEFAULT_ACADEMY_RULE_VERSION;
    const sessionTitles =
      input.session_titles && input.session_titles.length === 6
        ? input.session_titles
        : (MODULE_CURRICULA[moduleCode] ?? DEFAULT_SIX_SESSIONS);

    const uniqueTeacherIds = [...new Set(input.teacher_person_ids ?? [])];

    const cohort = await this.prisma.$transaction(async (tx) => {
      const created = await tx.academyCohort.create({
        data: {
          moduleCode,
          title: input.title.trim(),
          startsOn: input.starts_on.trim(),
          ruleVersion,
          notes: input.notes?.trim() || null,
          createdById: actor.personId,
          sessions: {
            create: sessionTitles.map((title, idx) => ({
              sessionNumber: idx + 1,
              title: title.trim() || `Session ${idx + 1}`,
            })),
          },
          teachers: {
            create: uniqueTeacherIds.map((teacherPersonId) => ({
              teacherPersonId,
              assignedById: actor.personId,
            })),
          },
        },
        include: {
          sessions: { orderBy: { sessionNumber: 'asc' } },
          teachers: true,
        },
      });

      await this.audit.record(
        {
          action: 'academy.cohort.created',
          actorId: actor.personId,
          subjectId: created.id,
          metadata: {
            moduleCode,
            title: created.title,
            ruleVersion,
            teacherPersonIds: uniqueTeacherIds,
          },
        },
        tx,
      );

      return created;
    });

    return {
      id: cohort.id,
      module_code: cohort.moduleCode,
      title: cohort.title,
      rule_version: cohort.ruleVersion,
      starts_on: cohort.startsOn,
      status: cohort.status,
      sessions_count: cohort.sessions.length,
      teachers_count: cohort.teachers.length,
    };
  }

  /**
   * Assign or update teachers on an existing cohort (HOF-019-S01).
   */
  async assignTeachers(actor: AuthContext, cohortId: string, teacherPersonIds: string[]) {
    const cohort = await this.prisma.academyCohort.findUnique({ where: { id: cohortId } });
    if (!cohort) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'COHORT_NOT_FOUND', 'Cohort not found.');
    }

    const uniqueIds = [...new Set(teacherPersonIds)];

    await this.prisma.$transaction(async (tx) => {
      await tx.academyTeacherAssignment.deleteMany({ where: { cohortId } });
      if (uniqueIds.length > 0) {
        await tx.academyTeacherAssignment.createMany({
          data: uniqueIds.map((teacherPersonId) => ({
            cohortId,
            teacherPersonId,
            assignedById: actor.personId,
          })),
        });
      }
      await this.audit.record(
        {
          action: 'academy.teachers.updated',
          actorId: actor.personId,
          subjectId: cohortId,
          metadata: { teacherPersonIds: uniqueIds },
        },
        tx,
      );
    });

    return { cohort_id: cohortId, teacher_person_ids: uniqueIds };
  }

  /**
   * HOF-019-S02 & S03: Enroll a Person in a cohort.
   * - Enforces prerequisites:
   *   - `FOUNDATION_101` requires either `foundationEligibleAt != null`, an IC `FoundationRecommendation`,
   *     or an explicit `prerequisite_override` with `override_reason`.
   *   - `MEMBERSHIP_201` requires `foundationClassStatus === 'COMPLETED'` (a graduated Foundation achievement)
   *     or an explicit `prerequisite_override` with `override_reason`.
   * - Supports retakes (`attemptNumber` increments if prior enrollment in the module was `WITHDRAWN` or `RETAKE_REQUIRED`).
   * - Updates `Person.foundationClassStatus = 'IN_PROGRESS'` when enrolling in `FOUNDATION_101`.
   */
  async enrollStudent(actor: AuthContext, cohortId: string, input: EnrollStudentInput) {
    const [cohort, person] = await Promise.all([
      this.prisma.academyCohort.findUnique({ where: { id: cohortId } }),
      this.prisma.person.findUnique({
        where: { id: input.person_id },
        include: {
          foundationRecommendation: true,
          academyEnrollments: { orderBy: { createdAt: 'desc' } },
        },
      }),
    ]);

    if (!cohort) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'COHORT_NOT_FOUND', 'Cohort not found.');
    }
    if (!person) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PERSON_NOT_FOUND', 'Person not found.');
    }

    const activeSameModule = person.academyEnrollments.find(
      (e) => e.moduleCode === cohort.moduleCode && e.status === 'ENROLLED',
    );
    if (activeSameModule) {
      if (activeSameModule.cohortId === cohortId) {
        return formatEnrollmentItem({
          ...activeSameModule,
          person: {
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            email: person.email,
            phone: person.phone,
            membershipStatus: person.membershipStatus,
            foundationClassStatus: person.foundationClassStatus,
            foundationEligibleAt: person.foundationEligibleAt,
          },
        });
      }
      throw new ApiError(
        HttpStatus.CONFLICT,
        'ALREADY_ENROLLED_IN_MODULE',
        `${person.firstName} ${person.lastName} already has an active enrollment in ${cohort.moduleCode}.`,
      );
    }

    // HOF-019-S02: Enforce module prerequisites unless an explicit override + reason is supplied
    const overrideReason = input.override_reason?.trim() || null;
    const hasOverride = Boolean(input.prerequisite_override && overrideReason);

    if (cohort.moduleCode === 'FOUNDATION_101') {
      const hasFoundationEligibility =
        Boolean(person.foundationEligibleAt) || Boolean(person.foundationRecommendation);
      if (!hasFoundationEligibility && !hasOverride) {
        throw new ApiError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'MISSING_PREREQUISITE',
          `${person.firstName} ${person.lastName} has not yet reached Foundation Class eligibility (2 qualifying visits or IC handoff). Provide an approved prerequisite override reason to enroll.`,
          {
            missing_prerequisite: 'FOUNDATION_ELIGIBILITY',
            module_code: 'FOUNDATION_101',
          },
        );
      }
    } else if (cohort.moduleCode === 'SUNDAY_SCHOOL_101') {
      const hasCompletedFoundation = person.foundationClassStatus === 'COMPLETED';
      if (!hasCompletedFoundation && !hasOverride) {
        throw new ApiError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'MISSING_PREREQUISITE',
          `${person.firstName} ${person.lastName} must complete Foundation Class (FOUNDATION_101) before enrolling in Sunday School Module 1 (SUNDAY_SCHOOL_101), unless an approved exemption is recorded.`,
          {
            missing_prerequisite: 'FOUNDATION_101',
            module_code: 'SUNDAY_SCHOOL_101',
          },
        );
      }
    } else if (cohort.moduleCode === 'SUNDAY_SCHOOL_102') {
      const hasCompletedSS1 =
        person.sundaySchoolStatus === 'MODULE_1_COMPLETED' ||
        person.sundaySchoolStatus === 'MODULE_2_IN_PROGRESS' ||
        person.sundaySchoolStatus === 'MODULE_2_COMPLETED' ||
        person.sundaySchoolStatus === 'MODULE_3_IN_PROGRESS' ||
        person.sundaySchoolStatus === 'COMPLETED' ||
        person.academyEnrollments.some(
          (e) => e.moduleCode === 'SUNDAY_SCHOOL_101' && e.status === 'GRADUATED',
        );
      if (!hasCompletedSS1 && !hasOverride) {
        throw new ApiError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'MISSING_PREREQUISITE',
          `${person.firstName} ${person.lastName} must complete Sunday School Module 1 before enrolling in Sunday School Module 2, unless an approved exemption is recorded.`,
          {
            missing_prerequisite: 'SUNDAY_SCHOOL_101',
            module_code: 'SUNDAY_SCHOOL_102',
          },
        );
      }
    } else if (cohort.moduleCode === 'SUNDAY_SCHOOL_103') {
      const hasCompletedSS2 =
        person.sundaySchoolStatus === 'MODULE_2_COMPLETED' ||
        person.sundaySchoolStatus === 'MODULE_3_IN_PROGRESS' ||
        person.sundaySchoolStatus === 'COMPLETED' ||
        person.academyEnrollments.some(
          (e) => e.moduleCode === 'SUNDAY_SCHOOL_102' && e.status === 'GRADUATED',
        );
      if (!hasCompletedSS2 && !hasOverride) {
        throw new ApiError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'MISSING_PREREQUISITE',
          `${person.firstName} ${person.lastName} must complete Sunday School Module 2 before enrolling in Sunday School Module 3, unless an approved exemption is recorded.`,
          {
            missing_prerequisite: 'SUNDAY_SCHOOL_102',
            module_code: 'SUNDAY_SCHOOL_103',
          },
        );
      }
    } else if (cohort.moduleCode === 'MEMBERSHIP_201') {
      const hasCompletedPrereq =
        person.sundaySchoolStatus === 'COMPLETED' ||
        person.academyEnrollments.some(
          (e) => e.moduleCode === 'SUNDAY_SCHOOL_103' && e.status === 'GRADUATED',
        ) ||
        person.foundationClassStatus === 'COMPLETED';
      if (!hasCompletedPrereq && !hasOverride) {
        throw new ApiError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'MISSING_PREREQUISITE',
          `${person.firstName} ${person.lastName} must complete Sunday School Module 3 before enrolling in Membership Class (MEMBERSHIP_201), unless an approved exemption is recorded.`,
          {
            missing_prerequisite: 'SUNDAY_SCHOOL_103',
            module_code: 'MEMBERSHIP_201',
          },
        );
      }
    }

    const priorModuleAttempts = person.academyEnrollments.filter(
      (e) => e.moduleCode === cohort.moduleCode,
    );
    const attemptNumber = priorModuleAttempts.length + 1;

    const enrollment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.academyEnrollment.create({
        data: {
          cohortId: cohort.id,
          personId: person.id,
          moduleCode: cohort.moduleCode,
          ruleVersion: cohort.ruleVersion,
          attemptNumber,
          status: 'ENROLLED',
          isPrerequisiteOverride: hasOverride,
          overrideReason: hasOverride ? overrideReason : null,
          enrolledById: actor.personId,
        },
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
              sundaySchoolStatus: true,
              foundationEligibleAt: true,
            },
          },
        },
      });

      if (cohort.moduleCode === 'FOUNDATION_101' && person.foundationClassStatus === 'NOT_STARTED') {
        await tx.person.update({
          where: { id: person.id },
          data: {
            foundationClassStatus: 'IN_PROGRESS',
            version: { increment: 1 },
          },
        });
        created.person.foundationClassStatus = 'IN_PROGRESS';
      } else if (cohort.moduleCode === 'SUNDAY_SCHOOL_101' && person.sundaySchoolStatus === 'NOT_STARTED') {
        await tx.person.update({
          where: { id: person.id },
          data: {
            sundaySchoolStatus: 'MODULE_1_IN_PROGRESS',
            version: { increment: 1 },
          },
        });
        created.person.sundaySchoolStatus = 'MODULE_1_IN_PROGRESS';
      } else if (cohort.moduleCode === 'SUNDAY_SCHOOL_102' && person.sundaySchoolStatus === 'MODULE_1_COMPLETED') {
        await tx.person.update({
          where: { id: person.id },
          data: {
            sundaySchoolStatus: 'MODULE_2_IN_PROGRESS',
            version: { increment: 1 },
          },
        });
        created.person.sundaySchoolStatus = 'MODULE_2_IN_PROGRESS';
      } else if (cohort.moduleCode === 'SUNDAY_SCHOOL_103' && person.sundaySchoolStatus === 'MODULE_2_COMPLETED') {
        await tx.person.update({
          where: { id: person.id },
          data: {
            sundaySchoolStatus: 'MODULE_3_IN_PROGRESS',
            version: { increment: 1 },
          },
        });
        created.person.sundaySchoolStatus = 'MODULE_3_IN_PROGRESS';
      }

      await this.audit.record(
        {
          action: 'academy.student.enrolled',
          actorId: actor.personId,
          subjectId: created.id,
          metadata: {
            cohortId: cohort.id,
            personId: person.id,
            moduleCode: cohort.moduleCode,
            attemptNumber,
            isPrerequisiteOverride: hasOverride,
            overrideReason,
          },
        },
        tx,
      );

      return created;
    });

    return formatEnrollmentItem(enrollment);
  }

  /**
   * HOF-019-S01: Verifies that the caller is either an assigned teacher for the cohort
   * or holds `academy.manage` / `academy.grade` CHURCH-level authority.
   */
  private async assertTeacherOrCoordinatorForCohort(actor: AuthContext, cohortId: string) {
    const hasCoordinatorGrant = actor.grants.some(
      (g) => g.capability === 'academy.manage' || g.capability === 'academy.grade',
    );
    if (hasCoordinatorGrant) return;

    const assignment = await this.prisma.academyTeacherAssignment.findUnique({
      where: {
        cohortId_teacherPersonId: {
          cohortId,
          teacherPersonId: actor.personId,
        },
      },
    });
    if (!assignment) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'NOT_ASSIGNED_TEACHER',
        'Only assigned cohort teachers or Academy coordinators can record session progress and rubric scores.',
      );
    }
  }

  /**
   * Record credited sessions (1..6) for an enrollment (HOF-020-S02).
   */
  async recordSessionProgress(
    actor: AuthContext,
    enrollmentId: string,
    input: RecordSessionProgressInput,
  ) {
    const enrollment = await this.prisma.academyEnrollment.findUnique({
      where: { id: enrollmentId },
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
            sundaySchoolStatus: true,
            foundationEligibleAt: true,
          },
        },
      },
    });
    if (!enrollment) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'ENROLLMENT_NOT_FOUND', 'Enrollment not found.');
    }

    await this.assertTeacherOrCoordinatorForCohort(actor, enrollment.cohortId);

    const validSessions = [...new Set(input.credited_sessions)]
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 6)
      .sort((a, b) => a - b);

    const updated = await this.prisma.academyEnrollment.update({
      where: { id: enrollmentId },
      data: {
        creditedSessions: validSessions,
        creditedSessionCount: validSessions.length,
      },
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
            sundaySchoolStatus: true,
            foundationEligibleAt: true,
          },
        },
      },
    });

    await this.audit.record({
      action: 'academy.sessions.recorded',
      actorId: actor.personId,
      subjectId: enrollmentId,
      metadata: {
        creditedSessions: validSessions,
        creditedSessionCount: validSessions.length,
      },
    });

    return formatEnrollmentItem(updated);
  }

  /**
   * HOF-020-S01 & S04: Grade the six-part rubric (maxima: 20, 20, 20, 20, 10, 10 = 100).
   * - Validates each component against its maximum and rejects out-of-range values with 422.
   * - Computes `totalScore` on the server rounded to 1 decimal place (e.g. 18+16+17+18+8+8.3 = 85.3).
   * - Preserves prior evidence in audit log if regraded.
   */
  async recordRubricGrades(
    actor: AuthContext,
    enrollmentId: string,
    input: RecordRubricGradesInput,
  ) {
    const enrollment = await this.prisma.academyEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'ENROLLMENT_NOT_FOUND', 'Enrollment not found.');
    }

    await this.assertTeacherOrCoordinatorForCohort(actor, enrollment.cohortId);

    const maxima = [20, 20, 20, 20, 10, 10] as const;
    const fieldErrors: Record<string, string> = {};
    input.scores.forEach((val, idx) => {
      const max = maxima[idx];
      if (typeof val !== 'number' || Number.isNaN(val) || val < 0 || val > max) {
        fieldErrors[`score_part_${idx + 1}`] = `Part ${idx + 1} score must be between 0 and ${max}`;
      }
    });

    if (Object.keys(fieldErrors).length > 0) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'RUBRIC_SCORE_OUT_OF_RANGE',
        'One or more rubric component scores are outside their permitted range (20, 20, 20, 20, 10, 10).',
        fieldErrors,
      );
    }

    const [p1, p2, p3, p4, p5, p6] = input.scores;
    const totalScore = Math.round((p1 + p2 + p3 + p4 + p5 + p6) * 10) / 10;

    const updated = await this.prisma.academyEnrollment.update({
      where: { id: enrollmentId },
      data: {
        scorePart1: p1,
        scorePart2: p2,
        scorePart3: p3,
        scorePart4: p4,
        scorePart5: p5,
        scorePart6: p6,
        totalScore,
        gradedById: actor.personId,
        gradedAt: new Date(),
      },
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
            sundaySchoolStatus: true,
            foundationEligibleAt: true,
          },
        },
      },
    });

    await this.audit.record({
      action: 'academy.rubric.graded',
      actorId: actor.personId,
      subjectId: enrollmentId,
      metadata: {
        previousTotalScore: enrollment.totalScore,
        scores: input.scores,
        totalScore,
      },
    });

    return formatEnrollmentItem(updated);
  }

  /**
   * HOF-020-S02: Coordinator makeup decision for students with 4 or 5 credited sessions.
   */
  async decideMakeup(actor: AuthContext, enrollmentId: string, input: ApproveMakeupInput) {
    const enrollment = await this.prisma.academyEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'ENROLLMENT_NOT_FOUND', 'Enrollment not found.');
    }

    const updated = await this.prisma.academyEnrollment.update({
      where: { id: enrollmentId },
      data: {
        makeupApproved: input.approved,
        makeupReason: input.reason.trim(),
        makeupApprovedById: actor.personId,
        makeupApprovedAt: new Date(),
      },
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
            sundaySchoolStatus: true,
            foundationEligibleAt: true,
          },
        },
      },
    });

    await this.audit.record({
      action: 'academy.makeup.decided',
      actorId: actor.personId,
      subjectId: enrollmentId,
      metadata: {
        approved: input.approved,
        reason: input.reason.trim(),
        creditedSessionCount: enrollment.creditedSessionCount,
      },
    });

    return formatEnrollmentItem(updated);
  }

  /**
   * HOF-019-S03: Withdraw an enrollment while preserving historical attempt and attendance,
   * leaving any concurrent program enrollment untouched.
   */
  async withdrawEnrollment(actor: AuthContext, enrollmentId: string, reason: string) {
    const enrollment = await this.prisma.academyEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'ENROLLMENT_NOT_FOUND', 'Enrollment not found.');
    }

    const updated = await this.prisma.academyEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: 'WITHDRAWN',
        withdrawnAt: new Date(),
        withdrawalReason: reason.trim(),
      },
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
            sundaySchoolStatus: true,
            foundationEligibleAt: true,
          },
        },
      },
    });

    await this.audit.record({
      action: 'academy.enrollment.withdrawn',
      actorId: actor.personId,
      subjectId: enrollmentId,
      metadata: {
        personId: enrollment.personId,
        moduleCode: enrollment.moduleCode,
        reason: reason.trim(),
      },
    });

    return formatEnrollmentItem(updated);
  }

  /**
   * HOF-020-S03: Graduate once after all requirements (score >= 50, sessions == 6 or
   * 4..5 with approved makeup) are resolved.
   * - Idempotent on retry: returns the existing graduation achievement without duplicating
   *   `JourneyTransition` records or auto-enrolling in a new cohort.
   */
  async graduateEnrollment(actor: AuthContext, enrollmentId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.academyEnrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          person: true,
        },
      });
      if (!enrollment) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'ENROLLMENT_NOT_FOUND', 'Enrollment not found.');
      }

      // Idempotent replay (HOF-020-S03)
      if (enrollment.status === 'GRADUATED') {
        return { enrollment, replayed: true };
      }

      const eligibilityState = evaluateGraduationEligibility({
        totalScore: enrollment.totalScore,
        creditedSessionCount: enrollment.creditedSessionCount,
        makeupApproved: enrollment.makeupApproved,
      });

      if (eligibilityState !== 'eligible') {
        if (eligibilityState === 'retake_required') {
          await tx.academyEnrollment.update({
            where: { id: enrollmentId },
            data: { status: 'RETAKE_REQUIRED' },
          });
        }
        throw new ApiError(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'GRADUATION_REQUIREMENTS_UNMET',
          `Cannot graduate yet: graduation eligibility state is "${eligibilityState}" (score: ${enrollment.totalScore ?? 'ungraded'}/100, credited sessions: ${enrollment.creditedSessionCount}/6, makeup approved: ${enrollment.makeupApproved}).`,
          {
            graduation_eligibility: eligibilityState,
          },
        );
      }

      const nextMembershipStatus: MembershipStatus =
        enrollment.moduleCode === 'FOUNDATION_101'
          ? enrollment.person.membershipStatus === 'VISITOR' ||
            enrollment.person.membershipStatus === 'FIRST_TIMER' ||
            enrollment.person.membershipStatus === 'FOUNDATION'
            ? 'MEMBER'
            : enrollment.person.membershipStatus
          : enrollment.moduleCode === 'MEMBERSHIP_201'
            ? 'WORKER'
            : enrollment.person.membershipStatus;

      const nextFoundationStatus: FoundationClassStatus =
        enrollment.moduleCode === 'FOUNDATION_101'
          ? 'COMPLETED'
          : enrollment.person.foundationClassStatus;

      const nextSundaySchoolStatus: SundaySchoolStatus =
        enrollment.moduleCode === 'SUNDAY_SCHOOL_101'
          ? 'MODULE_1_COMPLETED'
          : enrollment.moduleCode === 'SUNDAY_SCHOOL_102'
            ? 'MODULE_2_COMPLETED'
            : enrollment.moduleCode === 'SUNDAY_SCHOOL_103'
              ? 'COMPLETED'
              : enrollment.person.sundaySchoolStatus;

      const updatedEnrollment = await tx.academyEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'GRADUATED',
          graduatedAt: new Date(),
          graduatedById: actor.personId,
        },
        include: {
          person: true,
        },
      });

      await tx.person.update({
        where: { id: enrollment.personId },
        data: {
          membershipStatus: nextMembershipStatus,
          foundationClassStatus: nextFoundationStatus,
          sundaySchoolStatus: nextSundaySchoolStatus,
          version: { increment: 1 },
        },
      });

      await tx.journeyTransition.create({
        data: {
          personId: enrollment.personId,
          fromStatus: enrollment.person.membershipStatus,
          toStatus: nextMembershipStatus,
          fromFoundationStatus: enrollment.person.foundationClassStatus,
          toFoundationStatus: nextFoundationStatus,
          fromSundaySchoolStatus: enrollment.person.sundaySchoolStatus,
          toSundaySchoolStatus: nextSundaySchoolStatus,
          ruleVersion: enrollment.ruleVersion,
          isOverride: false,
          reason: `Graduated ${enrollment.moduleCode} with score ${enrollment.totalScore}/100 and ${enrollment.creditedSessionCount}/6 sessions.`,
          evidence: {
            enrollmentId: enrollment.id,
            cohortId: enrollment.cohortId,
            moduleCode: enrollment.moduleCode,
            totalScore: enrollment.totalScore,
            creditedSessionCount: enrollment.creditedSessionCount,
            makeupApproved: enrollment.makeupApproved,
            makeupReason: enrollment.makeupReason,
          },
          actorPersonId: actor.personId,
        },
      });

      // If an open FOUNDATION_HANDOFF follow-up task exists for this person, mark it completed
      await tx.followUpTask.updateMany({
        where: {
          personId: enrollment.personId,
          kind: 'FOUNDATION_HANDOFF',
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      await this.audit.record(
        {
          action: 'academy.enrollment.graduated',
          actorId: actor.personId,
          subjectId: enrollmentId,
          metadata: {
            personId: enrollment.personId,
            moduleCode: enrollment.moduleCode,
            totalScore: enrollment.totalScore,
            creditedSessionCount: enrollment.creditedSessionCount,
            ruleVersion: enrollment.ruleVersion,
          },
        },
        tx,
      );

      updatedEnrollment.person.membershipStatus = nextMembershipStatus;
      updatedEnrollment.person.foundationClassStatus = nextFoundationStatus;
      updatedEnrollment.person.sundaySchoolStatus = nextSundaySchoolStatus;
      return { enrollment: updatedEnrollment, replayed: false };
    });

    const nextStageEligible =
      result.enrollment.moduleCode === 'FOUNDATION_101'
        ? 'SUNDAY_SCHOOL_101'
        : result.enrollment.moduleCode === 'SUNDAY_SCHOOL_101'
          ? 'SUNDAY_SCHOOL_102'
          : result.enrollment.moduleCode === 'SUNDAY_SCHOOL_102'
            ? 'SUNDAY_SCHOOL_103'
            : result.enrollment.moduleCode === 'SUNDAY_SCHOOL_103'
              ? 'MEMBERSHIP_201'
              : 'STEWARD';

    return {
      ...formatEnrollmentItem(result.enrollment),
      replayed: result.replayed,
      next_stage_eligible: nextStageEligible,
    };
  }

  /**
   * HOF-019-S04: Student views own class schedule, session progress, and assessment feedback.
   * Strict SELF boundary: returns only enrollments where `personId === actor.personId`.
   */
  async listMyClasses(actor: AuthContext) {
    const enrollments = await this.prisma.academyEnrollment.findMany({
      where: { personId: actor.personId },
      orderBy: { createdAt: 'desc' },
      include: {
        cohort: {
          include: {
            sessions: { orderBy: { sessionNumber: 'asc' } },
          },
        },
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            membershipStatus: true,
            foundationClassStatus: true,
            sundaySchoolStatus: true,
            foundationEligibleAt: true,
          },
        },
      },
    });

    return enrollments.map((e) => ({
      ...formatEnrollmentItem(e),
      cohort_title: e.cohort.title,
      cohort_starts_on: e.cohort.startsOn,
      sessions: e.cohort.sessions.map((s) => ({
        session_number: s.sessionNumber,
        title: s.title,
        scheduled_on: s.scheduledOn,
      })),
    }));
  }

  /**
   * HOF-018-S02 & S03: Manual standing/journey override with reason & supporting evidence,
   * plus timeline inspection showing actor, rule version, evidence, and whether it was an override.
   */
  async recordStandingOverride(actor: AuthContext, input: OverrideStandingInput) {
    const person = await this.prisma.person.findUnique({ where: { id: input.person_id } });
    if (!person) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PERSON_NOT_FOUND', 'Person not found.');
    }

    const toStatus = input.to_status ?? person.membershipStatus;
    const toFoundationStatus = input.to_foundation_status ?? person.foundationClassStatus;
    const toSundaySchoolStatus = input.to_sunday_school_status ?? person.sundaySchoolStatus;
    const ruleVersion = input.rule_version?.trim() || DEFAULT_ACADEMY_RULE_VERSION;

    const transition = await this.prisma.$transaction(async (tx) => {
      await tx.person.update({
        where: { id: person.id },
        data: {
          membershipStatus: toStatus,
          foundationClassStatus: toFoundationStatus,
          sundaySchoolStatus: toSundaySchoolStatus,
          version: { increment: 1 },
        },
      });

      const created = await tx.journeyTransition.create({
        data: {
          personId: person.id,
          fromStatus: person.membershipStatus,
          toStatus,
          fromFoundationStatus: person.foundationClassStatus,
          toFoundationStatus,
          fromSundaySchoolStatus: person.sundaySchoolStatus,
          toSundaySchoolStatus,
          ruleVersion,
          isOverride: true,
          reason: input.reason.trim(),
          evidence: input.evidence_note ? { note: input.evidence_note.trim() } : Prisma.JsonNull,
          actorPersonId: actor.personId,
        },
      });

      await this.audit.record(
        {
          action: 'journey.standing.overridden',
          actorId: actor.personId,
          subjectId: person.id,
          metadata: {
            transitionId: created.id,
            fromStatus: person.membershipStatus,
            toStatus,
            fromFoundationStatus: person.foundationClassStatus,
            toFoundationStatus,
            fromSundaySchoolStatus: person.sundaySchoolStatus,
            toSundaySchoolStatus,
            ruleVersion,
            reason: input.reason.trim(),
          },
        },
        tx,
      );

      return created;
    });

    return {
      transition_id: transition.id,
      person_id: person.id,
      from_status: transition.fromStatus,
      to_status: transition.toStatus,
      from_foundation_status: transition.fromFoundationStatus,
      to_foundation_status: transition.toFoundationStatus,
      from_sunday_school_status: transition.fromSundaySchoolStatus,
      to_sunday_school_status: transition.toSundaySchoolStatus,
      rule_version: transition.ruleVersion,
      is_override: transition.isOverride,
      reason: transition.reason,
      created_at: transition.createdAt.toISOString(),
    };
  }

  /**
   * Returns aggregate pipeline counts across the 8 standard discipleship stages:
   * first_timer -> returning_visitor -> foundation_class -> sunday_school_module_1 ->
   * sunday_school_module_2 -> sunday_school_module_3 -> membership_class -> steward
   */
  async getDiscipleshipPipeline(_actor: AuthContext) {
    const people = await this.prisma.person.findMany({
      select: {
        membershipStatus: true,
        foundationClassStatus: true,
        sundaySchoolStatus: true,
        foundationEligibleAt: true,
      },
    });

    const pipeline = {
      first_timer: 0,
      returning_visitor: 0,
      foundation_class: 0,
      sunday_school_module_1: 0,
      sunday_school_module_2: 0,
      sunday_school_module_3: 0,
      membership_class: 0,
      steward: 0,
      total: people.length,
    };

    for (const p of people) {
      if (p.membershipStatus === 'WORKER') {
        pipeline.steward++;
      } else if (p.sundaySchoolStatus === 'COMPLETED') {
        pipeline.membership_class++;
      } else if (
        p.sundaySchoolStatus === 'MODULE_3_IN_PROGRESS' ||
        p.sundaySchoolStatus === 'MODULE_2_COMPLETED'
      ) {
        pipeline.sunday_school_module_3++;
      } else if (
        p.sundaySchoolStatus === 'MODULE_2_IN_PROGRESS' ||
        p.sundaySchoolStatus === 'MODULE_1_COMPLETED'
      ) {
        pipeline.sunday_school_module_2++;
      } else if (
        p.sundaySchoolStatus === 'MODULE_1_IN_PROGRESS' ||
        (p.foundationClassStatus === 'COMPLETED' && p.sundaySchoolStatus === 'NOT_STARTED')
      ) {
        pipeline.sunday_school_module_1++;
      } else if (p.foundationClassStatus === 'IN_PROGRESS' || p.membershipStatus === 'FOUNDATION') {
        pipeline.foundation_class++;
      } else if (p.membershipStatus === 'FIRST_TIMER') {
        pipeline.first_timer++;
      } else {
        pipeline.returning_visitor++;
      }
    }

    return pipeline;
  }

  /**
   * Returns Sunday School-specific metrics for the Sunday School dashboard tab.
   */
  async getSundaySchoolStats(_actor: AuthContext) {
    const [cohorts, enrollments] = await Promise.all([
      this.prisma.academyCohort.findMany({
        where: {
          moduleCode: {
            in: ['SUNDAY_SCHOOL_101', 'SUNDAY_SCHOOL_102', 'SUNDAY_SCHOOL_103'],
          },
        },
        select: { id: true, moduleCode: true, status: true },
      }),
      this.prisma.academyEnrollment.findMany({
        where: {
          moduleCode: {
            in: ['SUNDAY_SCHOOL_101', 'SUNDAY_SCHOOL_102', 'SUNDAY_SCHOOL_103'],
          },
        },
        select: {
          id: true,
          moduleCode: true,
          status: true,
          creditedSessionCount: true,
          makeupApproved: true,
        },
      }),
    ]);

    const activeCohorts = cohorts.filter((c) => c.status !== 'COMPLETED').length;
    const module1Enrolled = enrollments.filter(
      (e) => e.moduleCode === 'SUNDAY_SCHOOL_101' && e.status === 'ENROLLED',
    ).length;
    const module2Enrolled = enrollments.filter(
      (e) => e.moduleCode === 'SUNDAY_SCHOOL_102' && e.status === 'ENROLLED',
    ).length;
    const module3Enrolled = enrollments.filter(
      (e) => e.moduleCode === 'SUNDAY_SCHOOL_103' && e.status === 'ENROLLED',
    ).length;
    const graduatedCount = enrollments.filter((e) => e.status === 'GRADUATED').length;
    const makeupPendingCount = enrollments.filter(
      (e) =>
        e.status === 'ENROLLED' &&
        (e.creditedSessionCount === 4 || e.creditedSessionCount === 5) &&
        !e.makeupApproved,
    ).length;

    return {
      active_cohorts: activeCohorts,
      total_enrolled: module1Enrolled + module2Enrolled + module3Enrolled,
      module_1_enrolled: module1Enrolled,
      module_2_enrolled: module2Enrolled,
      module_3_enrolled: module3Enrolled,
      graduated_count: graduatedCount,
      makeup_pending_count: makeupPendingCount,
    };
  }

  /**
   * HOF-018-S02: View a person's journey transition timeline.
   * - Staff with `people.read` / `academy.read` see full actor, ruleVersion, reason, and evidence.
   * - Personal viewers (`self.journey.read` for their own `personId`) see only the permitted personal projection.
   */
  async getPersonJourneyTimeline(actor: AuthContext, personId: string) {
    const canReadAllPeople = actor.grants.some(
      (g) => g.capability === 'people.read' || g.capability === 'academy.read',
    );
    if (!canReadAllPeople && actor.personId !== personId) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'You can only view your own personal journey timeline.',
      );
    }

    const transitions = await this.prisma.journeyTransition.findMany({
      where: { personId },
      orderBy: { createdAt: 'desc' },
    });

    const actorIds = [...new Set(transitions.map((t) => t.actorPersonId))];
    const actors = actorIds.length
      ? await this.prisma.person.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const actorMap = new Map(actors.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));

    return transitions.map((t) => ({
      id: t.id,
      person_id: t.personId,
      from_status: t.fromStatus,
      to_status: t.toStatus,
      from_foundation_status: t.fromFoundationStatus,
      to_foundation_status: t.toFoundationStatus,
      from_sunday_school_status: t.fromSundaySchoolStatus,
      to_sunday_school_status: t.toSundaySchoolStatus,
      rule_version: t.ruleVersion,
      is_override: t.isOverride,
      reason: t.reason,
      actor_person_id: canReadAllPeople ? t.actorPersonId : null,
      actor_name: canReadAllPeople ? (actorMap.get(t.actorPersonId) ?? 'Steward') : 'Heritage Ministry',
      evidence: canReadAllPeople ? t.evidence : null,
      created_at: t.createdAt.toISOString(),
    }));
  }
}

function formatEnrollmentItem(e: {
  id: string;
  cohortId: string;
  personId: string;
  moduleCode: AcademyModuleCode;
  ruleVersion: string;
  attemptNumber: number;
  status: AcademyEnrollmentStatus;
  creditedSessions: Prisma.JsonValue;
  creditedSessionCount: number;
  scorePart1: number | null;
  scorePart2: number | null;
  scorePart3: number | null;
  scorePart4: number | null;
  scorePart5: number | null;
  scorePart6: number | null;
  totalScore: number | null;
  makeupApproved: boolean;
  makeupReason: string | null;
  isPrerequisiteOverride: boolean;
  overrideReason: string | null;
  graduatedAt: Date | null;
  withdrawnAt: Date | null;
  withdrawalReason: string | null;
  createdAt: Date;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    membershipStatus: MembershipStatus;
    foundationClassStatus: FoundationClassStatus;
    sundaySchoolStatus?: SundaySchoolStatus;
    foundationEligibleAt: Date | null;
  };
}) {
  const creditedSessions = Array.isArray(e.creditedSessions)
    ? (e.creditedSessions as number[])
    : [];
  const graduationEligibility = evaluateGraduationEligibility({
    totalScore: e.totalScore,
    creditedSessionCount: e.creditedSessionCount,
    makeupApproved: e.makeupApproved,
  });

  return {
    id: e.id,
    cohort_id: e.cohortId,
    person_id: e.personId,
    module_code: e.moduleCode,
    rule_version: e.ruleVersion,
    attempt_number: e.attemptNumber,
    status: e.status,
    credited_sessions: creditedSessions,
    credited_session_count: e.creditedSessionCount,
    scores: [
      e.scorePart1,
      e.scorePart2,
      e.scorePart3,
      e.scorePart4,
      e.scorePart5,
      e.scorePart6,
    ],
    total_score: e.totalScore,
    makeup_approved: e.makeupApproved,
    makeup_reason: e.makeupReason,
    graduation_eligibility: graduationEligibility,
    is_prerequisite_override: e.isPrerequisiteOverride,
    override_reason: e.overrideReason,
    graduated_at: e.graduatedAt?.toISOString() ?? null,
    withdrawn_at: e.withdrawnAt?.toISOString() ?? null,
    withdrawal_reason: e.withdrawalReason,
    created_at: e.createdAt.toISOString(),
    person: {
      id: e.person.id,
      first_name: e.person.firstName,
      last_name: e.person.lastName,
      email: e.person.email,
      phone: e.person.phone,
      membership_status: e.person.membershipStatus,
      foundation_class_status: e.person.foundationClassStatus,
      sunday_school_status: e.person.sundaySchoolStatus ?? 'NOT_STARTED',
      foundation_eligible_at: e.person.foundationEligibleAt?.toISOString() ?? null,
    },
  };
}
