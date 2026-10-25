import { HttpStatus, Injectable } from '@nestjs/common';
import type { FoundationClassStatus, MembershipStatus, Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../platform/audit/audit.module.js';
import { AppConfig } from '../../platform/config/config.module.js';
import { maskEmail, normalizeEmail } from '../../platform/crypto/tokens.js';
import { PrismaService } from '../../platform/database/prisma.module.js';
import { EmailService } from '../../platform/email/email.module.js';
import { welcomeVisitorEmail } from '../../platform/email/templates.js';
import { ApiError } from '../../platform/http/errors.js';
import type { AuthContext } from '../identity/auth.guard.js';

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
  membership_status?: MembershipStatus;
  foundation_class_status?: FoundationClassStatus;
  birth_month?: number | null;
  birth_day?: number | null;
  anniversary_month?: number | null;
  anniversary_day?: number | null;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

@Injectable()
export class PeopleService {
  constructor(
    private readonly prisma: PrismaService,
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
      missing_contact_reason: p.missingContactReason,
      membership_status: p.membershipStatus,
      foundation_class_status: p.foundationClassStatus,
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

      // Ensure an open follow-up task exists for this visitor
      const existingTask = await tx.followUpTask.findFirst({
        where: { personId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      });
      const followUpTask =
        existingTask ??
        (await tx.followUpTask.create({
          data: {
            personId,
            serviceOccurrenceId: occurrence.id,
            status: 'OPEN',
            dueAt: new Date(Date.now() + THREE_DAYS_MS),
          },
        }));

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
          },
        },
        tx,
      );

      const person = await tx.person.findUniqueOrThrow({ where: { id: personId } });
      return { person, attendance, followUpTask, isNewPerson };
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
}

function maskPhone(phone: string): string {
  const clean = phone.trim();
  if (clean.length <= 4) return '****';
  return `${'*'.repeat(Math.max(2, clean.length - 4))}${clean.slice(-4)}`;
}
