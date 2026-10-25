import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AuthTokenPurpose,
  ImportJobStatus,
  ImportRowState,
  MembershipStatus as PrismaMembershipStatus,
  Prisma,
  type FoundationClassStatus,
  type MembershipStatus,
  type Role,
} from '../../generated/prisma/client.js';
import { AuditService } from '../../platform/audit/audit.module.js';
import { AppConfig } from '../../platform/config/config.module.js';
import { maskEmail, normalizeEmail } from '../../platform/crypto/tokens.js';
import { PrismaService } from '../../platform/database/prisma.module.js';
import { EmailService } from '../../platform/email/email.module.js';
import { stewardInvitationEmail, welcomeVisitorEmail } from '../../platform/email/templates.js';
import { ApiError } from '../../platform/http/errors.js';
import { ROLE_LABELS, TEAM_SCOPED_ROLES } from '../access/capabilities.js';
import {
  FOUNDATION_ELIGIBILITY_RULE_VERSION,
  FOUNDATION_QUALIFYING_VISIT_THRESHOLD,
  syncFoundationEligibility,
} from '../attendance/attendance.service.js';
import type { AuthContext } from '../identity/auth.guard.js';
import { AuthService } from '../identity/auth.service.js';

export interface DirectoryFilter {
  search?: string;
  status?: MembershipStatus;
  foundation?: FoundationClassStatus;
  celebrationsMonth?: number;
}

export interface VisitorIntakeInput {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  address?: string;
  missing_contact_reason?: string;
  service_occurrence_id: string;
  existing_person_id?: string;
  inviter_person_id?: string;
  prayer_request?: string;
  birth_month?: number | null;
  birth_day?: number | null;
}

export interface UpdatePersonInput {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  photo_url?: string | null;
  membership_status?: MembershipStatus;
  foundation_class_status?: FoundationClassStatus;
  birth_month?: number | null;
  birth_day?: number | null;
  anniversary_month?: number | null;
  anniversary_day?: number | null;
}

export interface IssueClaimInvitationInput {
  email?: string;
  role?: Role | null;
  team_id?: string | null;
}

export interface CreateImportJobInput {
  file_name?: string;
  csv_text: string;
}

export interface UpdateImportRowInput {
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  membership_status?: MembershipStatus;
  birth_month?: number | null;
  birth_day?: number | null;
  anniversary_month?: number | null;
  anniversary_day?: number | null;
  approve_review?: boolean;
}

export interface CommitImportJobInput {
  idempotency_key?: string;
}

export interface RecommendFoundationInput {
  note: string;
  exempt_override?: boolean;
  exemption_reason?: string;
}

const HOUR = 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * HOURS_IN_DAY_FALLBACK();
function HOURS_IN_DAY_FALLBACK() {
  return 60 * 60 * 1000;
}

@Injectable()
export class PeopleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
  ) {}

  /**
   * Unified Church Directory (HOF-010 / HOF-012 / HOF-022).
   * Supports search by name/phone/email, filtering by membership status,
   * Foundation class progress, or celebrations month.
   * Prayer notes are intentionally omitted from directory listings (HOF-013-S04).
   */
  async listDirectory(filter: DirectoryFilter) {
    const where: Prisma.PersonWhereInput = {};

    if (filter.status) {
      where.membershipStatus = filter.status;
    }
    if (filter.foundation) {
      where.foundationClassStatus = filter.foundation;
    }
    if (filter.celebrationsMonth) {
      where.OR = [
        { birthMonth: filter.celebrationsMonth },
        { anniversaryMonth: filter.celebrationsMonth },
      ];
    }
    if (filter.search?.trim()) {
      const q = filter.search.trim();
      const searchClauses: Prisma.PersonWhereInput[] = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
      where.AND = [{ OR: searchClauses }];
    }

    const people = await this.prisma.person.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 250,
      include: {
        account: { select: { status: true, loginEmail: true } },
        _count: { select: { attendanceRecords: true, followUpTasks: true } },
      },
    });

    return people.map((p) => ({
      id: p.id,
      first_name: p.firstName,
      last_name: p.lastName,
      email: p.email,
      phone: p.phone,
      address: p.address,
      photo_url: p.photoUrl,
      is_verified: p.isVerified,
      verified_at: p.verifiedAt?.toISOString() ?? null,
      account_status: p.account?.status ?? null,
      missing_contact_reason: p.missingContactReason,
      membership_status: p.membershipStatus,
      foundation_class_status: p.foundationClassStatus,
      foundation_eligible_at: p.foundationEligibleAt?.toISOString() ?? null,
      foundation_rule_version: p.foundationRuleVersion ?? null,
      birth_month: p.birthMonth,
      birth_day: p.birthDay,
      anniversary_month: p.anniversaryMonth,
      anniversary_day: p.anniversaryDay,
      first_visited_at: p.firstVisitedAt?.toISOString() ?? null,
      attendance_count: p._count.attendanceRecords,
      followup_count: p._count.followUpTasks,
      version: p.version,
    }));
  }

  /**
   * Candidate duplicate check during Visitor Intake (HOF-013-S02).
   * Matches phone, email, or exact first+last name without automatically merging.
   */
  async findCandidates(query: { phone?: string; email?: string; name?: string }) {
    const clauses: Prisma.PersonWhereInput[] = [];
    if (query.phone?.trim() && query.phone.trim().length >= 5) {
      clauses.push({ phone: { contains: query.phone.trim() } });
    }
    if (query.email?.trim() && query.email.trim().length >= 4) {
      clauses.push({ email: { equals: normalizeEmail(query.email), mode: 'insensitive' } });
    }
    if (query.name?.trim() && query.name.trim().length >= 3) {
      const parts = query.name.trim().split(/\s+/);
      if (parts.length >= 2) {
        clauses.push({
          AND: [
            { firstName: { contains: parts[0], mode: 'insensitive' } },
            { lastName: { contains: parts.slice(1).join(' '), mode: 'insensitive' } },
          ],
        });
      } else {
        clauses.push({
          OR: [
            { firstName: { contains: parts[0], mode: 'insensitive' } },
            { lastName: { contains: parts[0], mode: 'insensitive' } },
          ],
        });
      }
    }

    if (clauses.length === 0) return [];

    const matches = await this.prisma.person.findMany({
      where: { OR: clauses },
      take: 8,
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { attendanceRecords: true } } },
    });

    return matches.map((m) => ({
      id: m.id,
      first_name: m.firstName,
      last_name: m.lastName,
      masked_email: m.email ? maskEmail(m.email) : null,
      masked_phone: m.phone ? maskPhone(m.phone) : null,
      membership_status: m.membershipStatus,
      attendance_count: m._count.attendanceRecords,
    }));
  }

  /**
   * Fast Visitor Intake (HOF-013-S01 to S05):
   * - Requires phone OR email OR missing_contact_reason (HOF-013-S03).
   * - Either attaches to an existing confirmed Person (HOF-013-S02) or creates a new Person.
   * - Atomically records an idempotent AttendanceRecord for the ServiceOccurrence.
   * - Atomically opens a FollowUpTask for the Follow-Up team.
   * - Separately stores any optional prayer request in PrayerNote (HOF-013-S04).
   * - Sends a welcome email via Resend if an email address was provided.
   */
  async captureVisitor(actor: AuthContext, input: VisitorIntakeInput) {
    const cleanPhone = input.phone?.trim() || null;
    const cleanEmail = input.email?.trim() ? normalizeEmail(input.email) : null;
    const missingReason = input.missing_contact_reason?.trim() || null;

    if (!cleanPhone && !cleanEmail && !missingReason && !input.existing_person_id) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'CONTACT_OR_REASON_REQUIRED',
        'Provide a phone number, email address, or a reason why contact details are unavailable.',
        { phone: 'Phone, email, or missing-contact reason is required' },
      );
    }

    const occurrence = await this.prisma.serviceOccurrence.findUnique({
      where: { id: input.service_occurrence_id },
    });
    if (!occurrence) {
      throw new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, 'OCCURRENCE_NOT_FOUND', 'Selected service occurrence does not exist.', {
        service_occurrence_id: 'Select a valid service',
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let personId: string;
      let isNewPerson = false;

      if (input.existing_person_id) {
        const existing = await tx.person.findUnique({ where: { id: input.existing_person_id } });
        if (!existing) {
          throw new ApiError(HttpStatus.NOT_FOUND, 'PERSON_NOT_FOUND', 'Selected person record was not found.');
        }
        personId = existing.id;
        // Enrich contact details if previously blank
        await tx.person.update({
          where: { id: existing.id },
          data: {
            phone: existing.phone ?? cleanPhone,
            email: existing.email ?? cleanEmail,
            address: existing.address ?? (input.address?.trim() || null),
            firstVisitedAt: existing.firstVisitedAt ?? occurrence.serviceDate,
            version: { increment: 1 },
          },
        });
      } else {
        isNewPerson = true;
        const created = await tx.person.create({
          data: {
            firstName: input.first_name.trim(),
            lastName: input.last_name.trim(),
            phone: cleanPhone,
            email: cleanEmail,
            address: input.address?.trim() || null,
            missingContactReason: !cleanPhone && !cleanEmail ? missingReason : null,
            membershipStatus: 'FIRST_TIMER',
            inviterPersonId: input.inviter_person_id || null,
            firstVisitedAt: occurrence.serviceDate,
            birthMonth: input.birth_month ?? null,
            birthDay: input.birth_day ?? null,
          },
        });
        personId = created.id;
      }

      // Idempotent attendance record per (serviceOccurrenceId, personId) (HOF-014-S01)
      const attendance = await tx.attendanceRecord.upsert({
        where: {
          serviceOccurrenceId_personId: {
            serviceOccurrenceId: occurrence.id,
            personId,
          },
        },
        update: {},
        create: {
          serviceOccurrenceId: occurrence.id,
          personId,
          source: 'visitor_intake',
          isFirstVisit: isNewPerson,
          recordedById: actor.personId,
        },
      });

      // Ensure an open WELCOME follow-up task exists for this visitor
      const existingTask = await tx.followUpTask.findFirst({
        where: { personId, kind: 'WELCOME', status: { in: ['OPEN', 'IN_PROGRESS'] } },
      });
      const followUpTask =
        existingTask ??
        (await tx.followUpTask.create({
          data: {
            personId,
            serviceOccurrenceId: occurrence.id,
            kind: 'WELCOME',
            status: 'OPEN',
            dueAt: new Date(Date.now() + THREE_DAYS_MS),
          },
        }));

      // HOF-015-S01: Synchronize Foundation eligibility when qualifying visits reach threshold
      const eligibility = await syncFoundationEligibility(tx, personId);

      // HOF-013-S04: Store prayer request in separate table
      if (input.prayer_request?.trim()) {
        await tx.prayerNote.create({
          data: {
            personId,
            serviceOccurrenceId: occurrence.id,
            content: input.prayer_request.trim(),
            createdById: actor.personId,
          },
        });
      }

      await this.audit.record(
        {
          action: 'visitors.captured',
          actorId: actor.personId,
          subjectId: personId,
          metadata: {
            serviceOccurrenceId: occurrence.id,
            isNewPerson,
            hasPrayerNote: Boolean(input.prayer_request?.trim()),
            qualifyingVisitsCount: eligibility.qualifyingVisitsCount,
            foundationEligible: eligibility.isEligible,
          },
        },
        tx,
      );

      const person = await tx.person.findUniqueOrThrow({ where: { id: personId } });
      return { person, attendance, followUpTask, isNewPerson, eligibility };
    });

    // Send welcome email via Resend when a new visitor supplies an email
    let welcomeEmailDelivery: 'SENT' | 'SKIPPED' | 'FAILED' = 'SKIPPED';
    if (result.person.email && result.isNewPerson) {
      try {
        const mail = welcomeVisitorEmail({
          firstName: result.person.firstName,
          serviceTitle: occurrence.title,
          webUrl: this.config.get('WEB_URL'),
        });
        await this.email.send({
          to: result.person.email,
          ...mail,
          idempotencyKey: `welcome-${result.person.id}-${occurrence.id}`,
        });
        welcomeEmailDelivery = 'SENT';
      } catch {
        welcomeEmailDelivery = 'FAILED';
      }
    }

    return {
      person_id: result.person.id,
      first_name: result.person.firstName,
      last_name: result.person.lastName,
      membership_status: result.person.membershipStatus,
      attendance_id: result.attendance.id,
      followup_task_id: result.followUpTask.id,
      is_new_person: result.isNewPerson,
      qualifying_visits_count: result.eligibility.qualifyingVisitsCount,
      foundation_eligible: result.eligibility.isEligible,
      foundation_rule_version: result.eligibility.foundationRuleVersion,
      welcome_email_delivery: welcomeEmailDelivery,
    };
  }

  /**
   * Create or update a person directly in the Directory (without Maker-Checker friction).
   */
  async createPerson(actor: AuthContext, input: UpdatePersonInput & { first_name: string; last_name: string }) {
    const person = await this.prisma.person.create({
      data: {
        firstName: input.first_name.trim(),
        lastName: input.last_name.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() ? normalizeEmail(input.email) : null,
        address: input.address?.trim() || null,
        membershipStatus: input.membership_status ?? 'MEMBER',
        foundationClassStatus: input.foundation_class_status ?? 'NOT_STARTED',
        birthMonth: input.birth_month ?? null,
        birthDay: input.birth_day ?? null,
        anniversaryMonth: input.anniversary_month ?? null,
        anniversaryDay: input.anniversary_day ?? null,
      },
    });
    await this.audit.record({
      action: 'people.created',
      actorId: actor.personId,
      subjectId: person.id,
    });
    return { id: person.id };
  }

  async updatePerson(actor: AuthContext, personId: string, input: UpdatePersonInput) {
    const existing = await this.prisma.person.findUnique({ where: { id: personId } });
    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PERSON_NOT_FOUND', 'Person not found.');
    }

    const updated = await this.prisma.person.update({
      where: { id: personId },
      data: {
        firstName: input.first_name?.trim() ?? existing.firstName,
        lastName: input.last_name?.trim() ?? existing.lastName,
        phone: input.phone !== undefined ? input.phone?.trim() || null : existing.phone,
        email: input.email !== undefined ? (input.email?.trim() ? normalizeEmail(input.email) : null) : existing.email,
        address: input.address !== undefined ? input.address?.trim() || null : existing.address,
        photoUrl: input.photo_url !== undefined ? input.photo_url?.trim() || null : existing.photoUrl,
        membershipStatus: input.membership_status ?? existing.membershipStatus,
        foundationClassStatus: input.foundation_class_status ?? existing.foundationClassStatus,
        birthMonth: input.birth_month !== undefined ? input.birth_month : existing.birthMonth,
        birthDay: input.birth_day !== undefined ? input.birth_day : existing.birthDay,
        anniversaryMonth: input.anniversary_month !== undefined ? input.anniversary_month : existing.anniversaryMonth,
        anniversaryDay: input.anniversary_day !== undefined ? input.anniversary_day : existing.anniversaryDay,
        version: { increment: 1 },
      },
    });

    await this.audit.record({
      action: 'people.updated',
      actorId: actor.personId,
      subjectId: personId,
      metadata: { membershipStatus: updated.membershipStatus, foundationClassStatus: updated.foundationClassStatus },
    });

    return {
      id: updated.id,
      membership_status: updated.membershipStatus,
      foundation_class_status: updated.foundationClassStatus,
      version: updated.version,
    };
  }

  /**
   * Verify a Person record independently of membership standing (HOF-002-S01 / HOF-017).
   * Required before issuing an account-claim invitation.
   */
  async verifyPerson(actor: AuthContext, personId: string) {
    const existing = await this.prisma.person.findUnique({ where: { id: personId } });
    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PERSON_NOT_FOUND', 'Person not found.');
    }
    const updated = await this.prisma.person.update({
      where: { id: personId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedById: actor.personId,
        version: { increment: 1 },
      },
    });
    await this.audit.record({
      action: 'people.verified',
      actorId: actor.personId,
      subjectId: personId,
    });
    return {
      id: updated.id,
      is_verified: updated.isVerified,
      verified_at: updated.verifiedAt?.toISOString() ?? null,
    };
  }

  /**
   * Issue a controlled claim invitation to a verified Person (HOF-002-S01).
   * - Enforces that the Person is verified (`isVerified = true`)
   * - Requires an eligible unique login email
   * - Does NOT infer any ministry appointment unless `role` is explicitly passed
   *   (and caller holds `stewards.invite`)
   */
  async issueClaimInvitation(actor: AuthContext, personId: string, input: IssueClaimInvitationInput) {
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      include: {
        account: true,
        assignments: { where: { endedAt: null }, include: { team: true }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!person) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PERSON_NOT_FOUND', 'Person not found.');
    }
    if (!person.isVerified) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'PERSON_NOT_VERIFIED',
        'Verify this person profile before sending an account claim invitation.',
      );
    }
    if (person.account?.status === 'ACTIVE') {
      throw new ApiError(HttpStatus.CONFLICT, 'ALREADY_CLAIMED', 'This person already has an active account.');
    }

    const loginEmail = normalizeEmail(input.email ?? person.account?.loginEmail ?? person.email ?? '');
    if (!loginEmail || !loginEmail.includes('@')) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'EMAIL_REQUIRED',
        'An email address is required to send an account claim invitation.',
        { email: 'Enter a valid email address' },
      );
    }

    // Check email uniqueness across other accounts
    const emailOwner = await this.prisma.account.findUnique({ where: { loginEmail } });
    if (emailOwner && emailOwner.personId !== personId) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'EMAIL_IN_USE',
        'That email address is already linked to another account.',
        { email: 'Already in use by another account' },
      );
    }

    // Optional explicit appointment (only if caller has stewards.invite)
    if (input.role) {
      const canInviteSteward = actor.grants.some((g) => g.capability === 'stewards.invite');
      if (!canInviteSteward) {
        throw new ApiError(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'You do not have permission to assign a ministry role.');
      }
      if (TEAM_SCOPED_ROLES.has(input.role) && !input.team_id) {
        throw new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, 'TEAM_REQUIRED', 'Select a team for this role.', {
          team_id: 'Team is required',
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (!person.email) {
        await tx.person.update({ where: { id: personId }, data: { email: loginEmail } });
      }
      if (!person.account) {
        await tx.account.create({
          data: { personId, loginEmail, status: 'PENDING' },
        });
      } else if (person.account.loginEmail !== loginEmail) {
        await tx.account.update({
          where: { id: person.account.id },
          data: { loginEmail, status: 'PENDING' },
        });
      }
      if (input.role) {
        await tx.assignment.create({
          data: {
            personId,
            role: input.role,
            teamId: input.team_id ?? null,
            createdById: actor.personId,
          },
        });
      }
      await this.audit.record(
        {
          action: 'people.claim_invitation.issued',
          actorId: actor.personId,
          subjectId: personId,
          metadata: { role: input.role ?? null, teamId: input.team_id ?? null },
        },
        tx,
      );
    });

    const ttlHours = this.config.get('CLAIM_TOKEN_TTL_HOURS');
    const token = await this.auth.issueToken(personId, AuthTokenPurpose.CLAIM, ttlHours * HOUR, actor.personId);
    const url = `${this.config.get('WEB_URL')}/auth/claim?token=${encodeURIComponent(token)}`;

    const refreshedAssignments = await this.prisma.assignment.findMany({
      where: { personId, endedAt: null },
      include: { team: true },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    const topAppointment = refreshedAssignments[0];

    const mail = stewardInvitationEmail({
      firstName: person.firstName,
      roleLabel: topAppointment ? ROLE_LABELS[topAppointment.role] : null,
      teamName: topAppointment?.team?.name ?? null,
      url,
      expiresInHours: ttlHours,
    });

    let delivery: 'SENT' | 'FAILED' = 'SENT';
    try {
      await this.email.send({ to: loginEmail, ...mail });
    } catch {
      delivery = 'FAILED';
    }

    return {
      person_id: personId,
      email: loginEmail,
      delivery,
    };
  }

  // ── Bulk CSV Directory Import (HOF-012-S02 / S03 / S04) ───────────────────

  /**
   * HOF-012-S02: Upload a CSV for preview without creating any Person or Account records.
   * Normalizes phone/email, validates row fields, and flags possible duplicates as REVIEW_REQUIRED.
   */
  async createImportPreview(actor: AuthContext, input: CreateImportJobInput) {
    const parsedRows = parseCsvRecords(input.csv_text);
    if (parsedRows.length === 0) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'EMPTY_CSV',
        'The uploaded CSV contains no data rows.',
      );
    }
    if (parsedRows.length > 500) {
      throw new ApiError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'CSV_TOO_LARGE',
        'Upload at most 500 rows per import batch.',
      );
    }

    const existingPeople = await this.prisma.person.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        isVerified: true,
      },
    });

    const evaluatedRows = parsedRows.map((raw, idx) =>
      evaluateImportRow(idx + 1, raw, existingPeople, parsedRows),
    );

    const job = await this.prisma.importJob.create({
      data: {
        fileName: input.file_name?.trim() || 'directory-import.csv',
        status: ImportJobStatus.PREVIEW,
        createdById: actor.personId,
        rows: {
          create: evaluatedRows.map((r) => ({
            rowIndex: r.rowIndex,
            firstName: r.firstName,
            lastName: r.lastName,
            phone: r.phone,
            normalizedPhone: r.normalizedPhone,
            email: r.email,
            normalizedEmail: r.normalizedEmail,
            address: r.address,
            membershipStatus: r.membershipStatus,
            birthMonth: r.birthMonth,
            birthDay: r.birthDay,
            anniversaryMonth: r.anniversaryMonth,
            anniversaryDay: r.anniversaryDay,
            state: r.state,
            errors: r.errors,
            warnings: r.warnings,
            matchedPersonId: r.matchedPersonId,
          })),
        },
      },
      include: {
        rows: { orderBy: { rowIndex: 'asc' } },
      },
    });

    await this.audit.record({
      action: 'people.import.preview_created',
      actorId: actor.personId,
      subjectId: job.id,
      metadata: { fileName: job.fileName, totalRows: job.rows.length },
    });

    return formatImportJobResponse(job);
  }

  /** Only the uploader or church-wide reporting roles (Admin/Pastor) may see an import job's rows. */
  private canAccessImportJob(actor: AuthContext, createdById: string): boolean {
    return (
      createdById === actor.personId ||
      actor.grants.some((g) => g.capability === 'reports.read' && g.scope === 'CHURCH')
    );
  }

  async listImportJobs(actor: AuthContext) {
    const jobs = await this.prisma.importJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { rows: { select: { state: true } } },
    });
    return jobs
      .filter((j) => this.canAccessImportJob(actor, j.createdById))
      .map((j) => ({
        id: j.id,
        file_name: j.fileName,
        status: j.status,
        created_at: j.createdAt.toISOString(),
        committed_at: j.committedAt?.toISOString() ?? null,
        summary: buildImportSummary(j.rows),
      }));
  }

  async getImportJob(jobId: string, actor?: AuthContext) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
      include: { rows: { orderBy: { rowIndex: 'asc' } } },
    });
    if (!job || (actor && !this.canAccessImportJob(actor, job.createdById))) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'IMPORT_JOB_NOT_FOUND', 'Import job not found.');
    }
    return formatImportJobResponse(job);
  }

  /**
   * HOF-012-S04: downloadable error report. Contains only rows the actor may access and
   * every cell is formula-safe (=, +, -, @ prefixed with an apostrophe) and CSV-quoted.
   */
  async buildImportErrorReport(actor: AuthContext, jobId: string): Promise<string> {
    const job = await this.getImportJob(jobId, actor);
    const q = (v: string | number | null | undefined) =>
      `"${sanitizeCsvFormulaCell(v == null ? '' : String(v)).replace(/"/g, '""')}"`;
    const lines = ['row,first_name,last_name,phone,email,state,errors,warnings'];
    for (const r of job.rows) {
      if (r.state !== 'INVALID' && r.state !== 'REVIEW_REQUIRED') continue;
      lines.push(
        [r.row_index, r.first_name, r.last_name, r.phone, r.email, r.state, r.errors.join('; '), r.warnings.join('; ')]
          .map(q)
          .join(','),
      );
    }
    return lines.join('\n');
  }

  /**
   * HOF-012-S02: Edit a row in preview and re-evaluate its validation / duplicate state
   * before commit without creating any Person record.
   */
  async updateImportRow(actor: AuthContext, jobId: string, rowId: string, input: UpdateImportRowInput) {
    const job = await this.prisma.importJob.findUnique({
      where: { id: jobId },
      include: { rows: { orderBy: { rowIndex: 'asc' } } },
    });
    if (!job || !this.canAccessImportJob(actor, job.createdById)) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'IMPORT_JOB_NOT_FOUND', 'Import job not found.');
    }
    if (job.status === ImportJobStatus.COMMITTED) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'IMPORT_ALREADY_COMMITTED',
        'This import job has already been committed and cannot be edited.',
      );
    }

    const row = job.rows.find((r) => r.id === rowId);
    if (!row) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'IMPORT_ROW_NOT_FOUND', 'Import row not found.');
    }

    const existingPeople = await this.prisma.person.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        isVerified: true,
      },
    });

    const mergedRaw: RawCsvRow = {
      first_name: input.first_name !== undefined ? input.first_name : row.firstName,
      last_name: input.last_name !== undefined ? input.last_name : row.lastName,
      phone: input.phone !== undefined ? input.phone ?? '' : row.phone ?? '',
      email: input.email !== undefined ? input.email ?? '' : row.email ?? '',
      address: input.address !== undefined ? input.address ?? '' : row.address ?? '',
      membership_status:
        input.membership_status !== undefined ? input.membership_status : row.membershipStatus,
      birth_month:
        input.birth_month !== undefined
          ? input.birth_month != null
            ? String(input.birth_month)
            : ''
          : row.birthMonth != null
            ? String(row.birthMonth)
            : '',
      birth_day:
        input.birth_day !== undefined
          ? input.birth_day != null
            ? String(input.birth_day)
            : ''
          : row.birthDay != null
            ? String(row.birthDay)
            : '',
      anniversary_month:
        input.anniversary_month !== undefined
          ? input.anniversary_month != null
            ? String(input.anniversary_month)
            : ''
          : row.anniversaryMonth != null
            ? String(row.anniversaryMonth)
            : '',
      anniversary_day:
        input.anniversary_day !== undefined
          ? input.anniversary_day != null
            ? String(input.anniversary_day)
            : ''
          : row.anniversaryDay != null
            ? String(row.anniversaryDay)
            : '',
    };

    const allRawRows: RawCsvRow[] = job.rows.map((r) =>
      r.id === rowId
        ? mergedRaw
        : {
            first_name: r.firstName,
            last_name: r.lastName,
            phone: r.phone ?? '',
            email: r.email ?? '',
            address: r.address ?? '',
            membership_status: r.membershipStatus,
            birth_month: r.birthMonth != null ? String(r.birthMonth) : '',
            birth_day: r.birthDay != null ? String(r.birthDay) : '',
            anniversary_month: r.anniversaryMonth != null ? String(r.anniversaryMonth) : '',
            anniversary_day: r.anniversaryDay != null ? String(r.anniversaryDay) : '',
          },
    );

    const evaluated = evaluateImportRow(
      row.rowIndex,
      mergedRaw,
      existingPeople,
      allRawRows,
      Boolean(input.approve_review),
    );

    await this.prisma.importJobRow.update({
      where: { id: rowId },
      data: {
        firstName: evaluated.firstName,
        lastName: evaluated.lastName,
        phone: evaluated.phone,
        normalizedPhone: evaluated.normalizedPhone,
        email: evaluated.email,
        normalizedEmail: evaluated.normalizedEmail,
        address: evaluated.address,
        membershipStatus: evaluated.membershipStatus,
        birthMonth: evaluated.birthMonth,
        birthDay: evaluated.birthDay,
        anniversaryMonth: evaluated.anniversaryMonth,
        anniversaryDay: evaluated.anniversaryDay,
        state: evaluated.state,
        errors: evaluated.errors,
        warnings: evaluated.warnings,
        matchedPersonId: evaluated.matchedPersonId,
      },
    });

    await this.audit.record({
      action: 'people.import.row_updated',
      actorId: actor.personId,
      subjectId: job.id,
      metadata: { rowId, rowIndex: row.rowIndex, state: evaluated.state },
    });

    return this.getImportJob(jobId);
  }

  /**
   * HOF-012-S03 & HOF-012-S04: Row-idempotent CSV commit.
   * - If the commit succeeded previously (or is retried after a lost network response),
   *   each accepted READY row is applied at most once (`appliedPersonId` is persisted per row).
   * - Rows in `INVALID` or `REVIEW_REQUIRED` state are never silently applied or used to
   *   overwrite existing verified/matching Person records (HOF-012-S04).
   * - Returns separate counts and row lists for `applied`, `failed` (`INVALID`), and
   *   `review_required` (`REVIEW_REQUIRED`) rows.
   */
  async commitImportJob(actor: AuthContext, jobId: string, input: CommitImportJobInput) {
    const result = await this.prisma.$transaction(async (tx) => {
      const job = await tx.importJob.findUnique({
        where: { id: jobId },
        include: { rows: { orderBy: { rowIndex: 'asc' } } },
      });
      if (!job || !this.canAccessImportJob(actor, job.createdById)) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'IMPORT_JOB_NOT_FOUND', 'Import job not found.');
      }

      // Row-level idempotency: only rows in READY state without appliedPersonId are created
      for (const row of job.rows) {
        if (row.state === ImportRowState.READY && !row.appliedPersonId) {
          // Double-check at commit time whether an existing Person now matches normalized contact (HOF-012-S04)
          const liveConflict = await findMatchingExistingPerson(tx, row.normalizedPhone, row.normalizedEmail);
          if (liveConflict) {
            const warningMsg = liveConflict.isVerified
              ? `Matches verified profile ${liveConflict.firstName} ${liveConflict.lastName} — requires review instead of overwriting master.`
              : `Possible duplicate of existing person ${liveConflict.firstName} ${liveConflict.lastName}.`;
            await tx.importJobRow.update({
              where: { id: row.id },
              data: {
                state: ImportRowState.REVIEW_REQUIRED,
                matchedPersonId: liveConflict.id,
                warnings: [warningMsg],
              },
            });
            continue;
          }

          const created = await tx.person.create({
            data: {
              firstName: row.firstName,
              lastName: row.lastName,
              phone: row.phone,
              email: row.normalizedEmail,
              address: row.address,
              membershipStatus: row.membershipStatus,
              birthMonth: row.birthMonth,
              birthDay: row.birthDay,
              anniversaryMonth: row.anniversaryMonth,
              anniversaryDay: row.anniversaryDay,
            },
          });

          await tx.importJobRow.update({
            where: { id: row.id },
            data: {
              state: ImportRowState.APPLIED,
              appliedPersonId: created.id,
              appliedAt: new Date(),
            },
          });
        }
      }

      const updatedRows = await tx.importJobRow.findMany({
        where: { jobId: job.id },
        orderBy: { rowIndex: 'asc' },
      });

      const summary = buildImportSummary(updatedRows);

      const updatedJob = await tx.importJob.update({
        where: { id: job.id },
        data: {
          status: ImportJobStatus.COMMITTED,
          committedById: job.committedById ?? actor.personId,
          committedAt: job.committedAt ?? new Date(),
          commitIdempotencyKey: job.commitIdempotencyKey ?? input.idempotency_key ?? null,
          summary,
        },
        include: { rows: { orderBy: { rowIndex: 'asc' } } },
      });

      await this.audit.record(
        {
          action: 'people.import.committed',
          actorId: actor.personId,
          subjectId: job.id,
          metadata: summary,
        },
        tx,
      );

      return updatedJob;
    });

    return formatImportJobResponse(result);
  }

  // ── Foundation Eligibility, Recommendation & Handoff (HOF-015) ────────────

  /**
   * HOF-015-S01 / S02 / S03: Lists visitors and first-timers with their live
   * qualifying visit count, Foundation eligibility against `v1:2_visits`, and
   * Information Center -> Membership handoff status (without requiring or granting
   * Membership workspace authority).
   */
  async listFoundationEligibility() {
    const people = await this.prisma.person.findMany({
      where: {
        OR: [
          { membershipStatus: { in: ['VISITOR', 'FIRST_TIMER', 'FOUNDATION'] } },
          { foundationEligibleAt: { not: null } },
          { foundationRecommendation: { isNot: null } },
        ],
      },
      orderBy: [{ foundationEligibleAt: 'desc' }, { updatedAt: 'desc' }],
      take: 150,
      include: {
        _count: { select: { attendanceRecords: true } },
        foundationRecommendation: {
          include: {
            followUpTask: {
              select: {
                id: true,
                status: true,
                assigneePersonId: true,
              },
            },
          },
        },
      },
    });

    const recommenderIds = [
      ...new Set(
        people
          .map((p) => p.foundationRecommendation?.recommendedById)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const recommenders = recommenderIds.length
      ? await this.prisma.person.findMany({
          where: { id: { in: recommenderIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const recommenderMap = new Map(recommenders.map((r) => [r.id, `${r.firstName} ${r.lastName}`]));

    return people.map((p) => {
      const qualifyingVisitsCount = p._count.attendanceRecords;
      const isEligible = qualifyingVisitsCount >= FOUNDATION_QUALIFYING_VISIT_THRESHOLD;
      const rec = p.foundationRecommendation;
      return {
        person_id: p.id,
        first_name: p.firstName,
        last_name: p.lastName,
        phone: p.phone,
        email: p.email,
        membership_status: p.membershipStatus,
        foundation_class_status: p.foundationClassStatus,
        qualifying_visits_count: qualifyingVisitsCount,
        required_visits_threshold: FOUNDATION_QUALIFYING_VISIT_THRESHOLD,
        is_eligible: isEligible,
        foundation_eligible_at: isEligible
          ? (p.foundationEligibleAt?.toISOString() ?? null)
          : null,
        foundation_rule_version: isEligible
          ? (p.foundationRuleVersion ?? FOUNDATION_ELIGIBILITY_RULE_VERSION)
          : null,
        handoff_status: rec ? ('HANDED_OFF_TO_MEMBERSHIP' as const) : ('NOT_RECOMMENDED' as const),
        recommendation: rec
          ? {
              id: rec.id,
              rule_version: rec.ruleVersion,
              qualifying_visits_count: rec.qualifyingVisitsCount,
              is_exemption: rec.isExemption,
              exemption_reason: rec.exemptionReason,
              note: rec.note,
              recommended_by_id: rec.recommendedById,
              recommended_by_name: recommenderMap.get(rec.recommendedById) ?? 'IC Steward',
              followup_task_id: rec.followUpTaskId,
              followup_task_status: rec.followUpTask?.status ?? 'OPEN',
              created_at: rec.createdAt.toISOString(),
            }
          : null,
      };
    });
  }

  /**
   * HOF-015-S02 & HOF-015-S03: Submit a Foundation recommendation and hand off to Membership.
   * - Re-evaluates live attendance evidence inside the transaction (`HOF-015-S03`).
   * - If attendance was corrected so qualifying visits < 2 and no authorized exemption is
   *   supplied, clears stale eligibility and refuses with `422 INSUFFICIENT_QUALIFYING_VISITS`.
   * - Commits the `FoundationRecommendation`, durable audit event, and exactly one
   *   `FOUNDATION_HANDOFF` task in Membership atomically (`HOF-015-S02`).
   * - Idempotent on replay: if a recommendation already exists for `personId`, returns the
   *   existing recommendation and task without creating duplicate Membership tasks.
   */
  async recommendForFoundation(
    actor: AuthContext,
    personId: string,
    input: RecommendFoundationInput,
  ) {
    const cleanNote = input.note.trim();
    const exemptionReason = input.exemption_reason?.trim() || null;
    const canAuthorizeExemption = actor.grants.some(
      (g) =>
        g.capability === 'people.write' ||
        g.capability === 'followups.assign' ||
        g.capability === 'governance.audit.read',
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const person = await tx.person.findUnique({
        where: { id: personId },
        include: {
          foundationRecommendation: {
            include: { followUpTask: true },
          },
        },
      });
      if (!person) {
        throw new ApiError(HttpStatus.NOT_FOUND, 'PERSON_NOT_FOUND', 'Person not found.');
      }

      // Replay idempotency (HOF-015-S02): if already recommended, return the single existing handoff
      if (person.foundationRecommendation) {
        const existingRec = person.foundationRecommendation;
        return {
          recommendation: existingRec,
          followUpTask: existingRec.followUpTask,
          replayed: true,
        };
      }

      // HOF-015-S03: Re-evaluate live qualifying attendance count before action
      const liveEligibility = await syncFoundationEligibility(tx, personId);

      if (!liveEligibility.isEligible) {
        const wantsExemption = Boolean(input.exempt_override && exemptionReason);
        if (!wantsExemption) {
          throw new ApiError(
            HttpStatus.UNPROCESSABLE_ENTITY,
            'INSUFFICIENT_QUALIFYING_VISITS',
            `Eligibility re-evaluated: ${person.firstName} ${person.lastName} currently has ${liveEligibility.qualifyingVisitsCount} of ${FOUNDATION_QUALIFYING_VISIT_THRESHOLD} required qualifying visits (${FOUNDATION_ELIGIBILITY_RULE_VERSION}). Attendance evidence changed or is below threshold; request an authorized exemption to proceed.`,
            {
              qualifying_visits_count: String(liveEligibility.qualifyingVisitsCount),
              required_visits_threshold: String(FOUNDATION_QUALIFYING_VISIT_THRESHOLD),
              rule_version: FOUNDATION_ELIGIBILITY_RULE_VERSION,
            },
          );
        }
        if (!canAuthorizeExemption) {
          throw new ApiError(
            HttpStatus.FORBIDDEN,
            'EXEMPTION_AUTHORITY_REQUIRED',
            'Only a Team Lead, Pastor, or Admin can authorize a Foundation eligibility exemption when qualifying visits are below threshold.',
          );
        }
      }

      const latestAttendance = await tx.attendanceRecord.findFirst({
        where: { personId },
        orderBy: { createdAt: 'desc' },
      });

      // Ensure at most one FOUNDATION_HANDOFF task is ever created for this person
      const existingHandoffTask = await tx.followUpTask.findFirst({
        where: { personId, kind: 'FOUNDATION_HANDOFF' },
      });

      const followUpTask =
        existingHandoffTask ??
        (await tx.followUpTask.create({
          data: {
            personId,
            serviceOccurrenceId: latestAttendance?.serviceOccurrenceId ?? null,
            kind: 'FOUNDATION_HANDOFF',
            recommendationNote: cleanNote,
            status: 'OPEN',
            dueAt: new Date(Date.now() + THREE_DAYS_MS),
          },
        }));

      const recommendation = await tx.foundationRecommendation.create({
        data: {
          personId,
          ruleVersion: FOUNDATION_ELIGIBILITY_RULE_VERSION,
          qualifyingVisitsCount: liveEligibility.qualifyingVisitsCount,
          isExemption: !liveEligibility.isEligible,
          exemptionReason: !liveEligibility.isEligible ? exemptionReason : null,
          note: cleanNote,
          recommendedById: actor.personId,
          followUpTaskId: followUpTask.id,
        },
      });

      await this.audit.record(
        {
          action: 'foundation.recommended',
          actorId: actor.personId,
          subjectId: personId,
          metadata: {
            recommendationId: recommendation.id,
            followUpTaskId: followUpTask.id,
            ruleVersion: recommendation.ruleVersion,
            qualifyingVisitsCount: recommendation.qualifyingVisitsCount,
            isExemption: recommendation.isExemption,
            exemptionReason: recommendation.exemptionReason,
          },
        },
        tx,
      );

      return { recommendation, followUpTask, replayed: false };
    });

    return {
      recommendation_id: result.recommendation.id,
      person_id: personId,
      followup_task_id: result.followUpTask.id,
      handoff_status: 'HANDED_OFF_TO_MEMBERSHIP' as const,
      rule_version: result.recommendation.ruleVersion,
      qualifying_visits_count: result.recommendation.qualifyingVisitsCount,
      is_exemption: result.recommendation.isExemption,
      exemption_reason: result.recommendation.exemptionReason,
      note: result.recommendation.note,
      replayed: result.replayed,
      created_at: result.recommendation.createdAt.toISOString(),
    };
  }
}

function maskPhone(phone: string): string {
  const clean = phone.trim();
  if (clean.length <= 4) return '****';
  return `${'*'.repeat(Math.max(2, clean.length - 4))}${clean.slice(-4)}`;
}

// ── CSV Import Helpers (HOF-012-S02..S04) ────────────────────────────────────

interface RawCsvRow {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  membership_status: string;
  birth_month: string;
  birth_day: string;
  anniversary_month: string;
  anniversary_day: string;
}

interface ExistingPersonSnapshot {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  isVerified: boolean;
}

const VALID_MEMBERSHIP_STATUSES = new Set<string>([
  PrismaMembershipStatus.VISITOR,
  PrismaMembershipStatus.FIRST_TIMER,
  PrismaMembershipStatus.FOUNDATION,
  PrismaMembershipStatus.MEMBER,
  PrismaMembershipStatus.WORKER,
  PrismaMembershipStatus.INACTIVE,
]);

export function normalizePhoneKey(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits.slice(-10);
}

/**
 * Sanitize cell values for downloadable CSV reports so spreadsheets cannot execute
 * formulas (`=`, `+`, `-`, `@`, `\t`, `\r`) — HOF-012-S04.
 */
export function sanitizeCsvFormulaCell(value: string | null | undefined): string {
  const str = (value ?? '').trim();
  if (!str) return '';
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvRecords(csvText: string): RawCsvRow[] {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) =>
    h
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, ''),
  );

  const idxOf = (...aliases: string[]) => {
    for (const a of aliases) {
      const i = headers.indexOf(a);
      if (i !== -1) return i;
    }
    return -1;
  };

  const firstIdx = idxOf('first_name', 'firstname', 'first', 'given_name');
  const lastIdx = idxOf('last_name', 'lastname', 'surname', 'last', 'family_name');
  const phoneIdx = idxOf('phone', 'phone_number', 'mobile', 'tel');
  const emailIdx = idxOf('email', 'email_address');
  const addressIdx = idxOf('address', 'home_address', 'location');
  const statusIdx = idxOf('membership_status', 'status', 'standing', 'stage');
  const birthMonthIdx = idxOf('birth_month', 'birthmonth');
  const birthDayIdx = idxOf('birth_day', 'birthday');
  const annivMonthIdx = idxOf('anniversary_month', 'anniversarymonth');
  const annivDayIdx = idxOf('anniversary_day', 'anniversaryday');

  const rows: RawCsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const get = (idx: number) => (idx >= 0 && idx < cols.length ? cols[idx] : '');
    rows.push({
      first_name: get(firstIdx),
      last_name: get(lastIdx),
      phone: get(phoneIdx),
      email: get(emailIdx),
      address: get(addressIdx),
      membership_status: get(statusIdx),
      birth_month: get(birthMonthIdx),
      birth_day: get(birthDayIdx),
      anniversary_month: get(annivMonthIdx),
      anniversary_day: get(annivDayIdx),
    });
  }
  return rows;
}

function evaluateImportRow(
  rowIndex: number,
  raw: RawCsvRow,
  existingPeople: ExistingPersonSnapshot[],
  allBatchRows: RawCsvRow[],
  approveReview = false,
) {
  const errors: string[] = [];
  const warnings: string[] = [];

  const firstName = sanitizeCsvFormulaCell(raw.first_name);
  const lastName = sanitizeCsvFormulaCell(raw.last_name);
  const phone = raw.phone?.trim() ? sanitizeCsvFormulaCell(raw.phone) : null;
  const rawEmail = raw.email?.trim() || null;
  const address = raw.address?.trim() ? sanitizeCsvFormulaCell(raw.address) : null;

  if (!firstName) errors.push('First name is required');
  if (!lastName) errors.push('Last name is required');

  let normalizedEmail: string | null = null;
  if (rawEmail) {
    const candidate = normalizeEmail(rawEmail);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
      errors.push(`Invalid email address "${rawEmail}"`);
    } else {
      normalizedEmail = candidate;
    }
  }

  const normalizedPhone = normalizePhoneKey(phone);
  if (phone && !normalizedPhone) {
    errors.push(`Invalid phone number "${phone}" (at least 7 digits required)`);
  }

  const rawStatus = (raw.membership_status?.trim() || 'MEMBER').toUpperCase();
  let membershipStatus: MembershipStatus = PrismaMembershipStatus.MEMBER;
  if (VALID_MEMBERSHIP_STATUSES.has(rawStatus)) {
    membershipStatus = rawStatus as MembershipStatus;
  } else {
    errors.push(`Invalid membership_status "${raw.membership_status}"`);
  }

  const parseOptionalInt = (val: string, label: string, min: number, max: number): number | null => {
    if (!val || !val.trim()) return null;
    const n = Number(val.trim());
    if (!Number.isInteger(n) || n < min || n > max) {
      errors.push(`${label} must be between ${min} and ${max}`);
      return null;
    }
    return n;
  };

  const birthMonth = parseOptionalInt(raw.birth_month, 'birth_month', 1, 12);
  const birthDay = parseOptionalInt(raw.birth_day, 'birth_day', 1, 31);
  const anniversaryMonth = parseOptionalInt(raw.anniversary_month, 'anniversary_month', 1, 12);
  const anniversaryDay = parseOptionalInt(raw.anniversary_day, 'anniversary_day', 1, 31);

  let matchedPersonId: string | null = null;
  let matchedVerified = false;

  for (const p of existingPeople) {
    const existingPhoneKey = normalizePhoneKey(p.phone);
    const existingEmailKey = p.email ? normalizeEmail(p.email) : null;

    const phoneMatch = Boolean(normalizedPhone && existingPhoneKey && normalizedPhone === existingPhoneKey);
    const emailMatch = Boolean(normalizedEmail && existingEmailKey && normalizedEmail === existingEmailKey);

    if (phoneMatch || emailMatch) {
      matchedPersonId = p.id;
      matchedVerified = p.isVerified;
      const reason = phoneMatch && emailMatch ? 'phone and email' : phoneMatch ? 'phone' : 'email';
      if (p.isVerified) {
        warnings.push(
          `Matches verified profile ${p.firstName} ${p.lastName} by ${reason} — held for review rather than overwriting master.`,
        );
      } else {
        warnings.push(`Possible duplicate of existing person ${p.firstName} ${p.lastName} (matching ${reason}).`);
      }
      break;
    }
  }

  // Check intra-batch duplicate contacts
  for (let i = 0; i < allBatchRows.length; i++) {
    if (i + 1 === rowIndex) continue;
    const other = allBatchRows[i];
    const otherPhone = normalizePhoneKey(other.phone);
    const otherEmail = other.email?.trim() ? normalizeEmail(other.email) : null;
    if (
      (normalizedPhone && otherPhone && normalizedPhone === otherPhone) ||
      (normalizedEmail && otherEmail && normalizedEmail === otherEmail)
    ) {
      warnings.push(`Shares contact with row #${i + 1} (${other.first_name} ${other.last_name}) in this CSV.`);
      break;
    }
  }

  let state: ImportRowState = ImportRowState.READY;
  if (errors.length > 0) {
    state = ImportRowState.INVALID;
  } else if (warnings.length > 0 && (!approveReview || matchedVerified)) {
    // HOF-012-S04: Verified profile matches cannot bypass review/approval to overwrite master
    state = ImportRowState.REVIEW_REQUIRED;
  }

  return {
    rowIndex,
    firstName,
    lastName,
    phone,
    normalizedPhone,
    email: rawEmail ? sanitizeCsvFormulaCell(rawEmail) : null,
    normalizedEmail,
    address,
    membershipStatus,
    birthMonth,
    birthDay,
    anniversaryMonth,
    anniversaryDay,
    state,
    errors,
    warnings,
    matchedPersonId,
  };
}

async function findMatchingExistingPerson(
  tx: Prisma.TransactionClient,
  normalizedPhone: string | null,
  normalizedEmail: string | null,
) {
  if (!normalizedPhone && !normalizedEmail) return null;
  const clauses: Prisma.PersonWhereInput[] = [];
  if (normalizedEmail) {
    clauses.push({ email: { equals: normalizedEmail, mode: 'insensitive' } });
  }
  if (normalizedPhone) {
    clauses.push({ phone: { contains: normalizedPhone.slice(-7) } });
  }
  const candidates = await tx.person.findMany({
    where: { OR: clauses },
    select: { id: true, firstName: true, lastName: true, phone: true, email: true, isVerified: true },
  });
  for (const c of candidates) {
    const pMatch = normalizedPhone && normalizePhoneKey(c.phone) === normalizedPhone;
    const eMatch = normalizedEmail && c.email && normalizeEmail(c.email) === normalizedEmail;
    if (pMatch || eMatch) return c;
  }
  return null;
}

function buildImportSummary(
  rows: {
    state: ImportRowState;
  }[],
) {
  let ready = 0;
  let applied = 0;
  let failed = 0;
  let reviewRequired = 0;
  for (const r of rows) {
    if (r.state === ImportRowState.READY) ready++;
    else if (r.state === ImportRowState.APPLIED) applied++;
    else if (r.state === ImportRowState.INVALID) failed++;
    else if (r.state === ImportRowState.REVIEW_REQUIRED) reviewRequired++;
  }
  return {
    total_rows: rows.length,
    ready_count: ready,
    applied_count: applied,
    failed_count: failed,
    review_required_count: reviewRequired,
  };
}

function formatImportJobResponse(job: {
  id: string;
  fileName: string | null;
  status: ImportJobStatus;
  committedAt: Date | null;
  createdAt: Date;
  rows: {
    id: string;
    rowIndex: number;
    firstName: string;
    lastName: string;
    phone: string | null;
    normalizedPhone: string | null;
    email: string | null;
    normalizedEmail: string | null;
    address: string | null;
    membershipStatus: MembershipStatus;
    birthMonth: number | null;
    birthDay: number | null;
    anniversaryMonth: number | null;
    anniversaryDay: number | null;
    state: ImportRowState;
    errors: Prisma.JsonValue;
    warnings: Prisma.JsonValue;
    matchedPersonId: string | null;
    appliedPersonId: string | null;
    appliedAt: Date | null;
  }[];
}) {
  const summary = buildImportSummary(job.rows);
  const formattedRows = job.rows.map((r) => ({
    id: r.id,
    row_index: r.rowIndex,
    first_name: r.firstName,
    last_name: r.lastName,
    phone: r.phone,
    normalized_phone: r.normalizedPhone,
    email: r.email,
    normalized_email: r.normalizedEmail,
    address: r.address,
    membership_status: r.membershipStatus,
    birth_month: r.birthMonth,
    birth_day: r.birthDay,
    anniversary_month: r.anniversaryMonth,
    anniversary_day: r.anniversaryDay,
    state: r.state,
    errors: Array.isArray(r.errors) ? (r.errors as string[]) : [],
    warnings: Array.isArray(r.warnings) ? (r.warnings as string[]) : [],
    matched_person_id: r.matchedPersonId,
    applied_person_id: r.appliedPersonId,
    applied_at: r.appliedAt?.toISOString() ?? null,
    formula_safe_first_name: sanitizeCsvFormulaCell(r.firstName),
    formula_safe_last_name: sanitizeCsvFormulaCell(r.lastName),
  }));

  return {
    id: job.id,
    file_name: job.fileName,
    status: job.status,
    committed_at: job.committedAt?.toISOString() ?? null,
    created_at: job.createdAt.toISOString(),
    summary,
    rows: formattedRows,
    buckets: {
      applied: formattedRows.filter((r) => r.state === ImportRowState.APPLIED),
      failed: formattedRows.filter((r) => r.state === ImportRowState.INVALID),
      review_required: formattedRows.filter((r) => r.state === ImportRowState.REVIEW_REQUIRED),
      ready: formattedRows.filter((r) => r.state === ImportRowState.READY),
    },
  };
}
