import { Injectable } from '@nestjs/common';
import type {
  CelebrationContactChannel,
  CelebrationKind,
  LandmarkApprovalStatus,
  LandmarkCategory,
  LandmarkPublicationPreference,
  LeapDayPolicy,
} from '../../generated/prisma/client.js';
import { AuditService } from '../../platform/audit/audit.module.js';
import { AppConfig } from '../../platform/config/config.module.js';
import { PrismaService } from '../../platform/database/prisma.module.js';
import { EmailService } from '../../platform/email/email.module.js';
import { celebrationGreetingEmail } from '../../platform/email/templates.js';
import { ApiError } from '../../platform/http/errors.js';
import type { AuthContext } from '../identity/auth.guard.js';

export const DEFAULT_CHURCH_TIMEZONE = 'Africa/Lagos';
export const DEFAULT_LEAP_DAY_POLICY: LeapDayPolicy = 'FEB_28';

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Formats a Date into `YYYY-MM-DD` in the given IANA timezone (`Africa/Lagos` by default).
 */
export function getLocalIsoDate(now: Date = new Date(), timezone: string = DEFAULT_CHURCH_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(isoDate: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Invalid local_date; expected YYYY-MM-DD.', {
      local_date: 'Use YYYY-MM-DD format',
    });
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() + 1 !== month || utc.getUTCDate() !== day) {
    throw new ApiError(400, 'VALIDATION_FAILED', 'local_date is not a valid calendar date.', {
      local_date: 'Invalid calendar day',
    });
  }
  return { year, month, day };
}

/**
 * HOF-022-S02: Resolves the observed month & day for a celebration in a target calendar year
 * according to the explicit `LeapDayPolicy` (`FEB_28` vs `MAR_01`) when `month === 2 && day === 29`.
 */
export function resolveObservedMonthDay(
  sourceMonth: number,
  sourceDay: number,
  targetYear: number,
  leapDayPolicy: LeapDayPolicy,
): { observedMonth: number; observedDay: number } {
  if (sourceMonth === 2 && sourceDay === 29 && !isLeapYear(targetYear)) {
    if (leapDayPolicy === 'MAR_01') {
      return { observedMonth: 3, observedDay: 1 };
    }
    return { observedMonth: 2, observedDay: 28 };
  }
  return { observedMonth: sourceMonth, observedDay: sourceDay };
}

/**
 * HOF-022-S01 / S02: Evaluates whether a (sourceMonth, sourceDay) falls within
 * `[0..windowDays]` of `localDate` (`YYYY-MM-DD`), cleanly crossing a year boundary
 * (e.g., Dec 30 -> Jan 2 is `daysUntil = 3` in `celebrationYear = localYear + 1`)
 * and without requiring or inventing any birth/marriage year.
 */
export function evaluateUpcomingCelebration(params: {
  sourceMonth: number;
  sourceDay: number;
  localDate: string;
  windowDays: number;
  leapDayPolicy: LeapDayPolicy;
}): {
  celebrationYear: number;
  observedMonth: number;
  observedDay: number;
  observedDate: string;
  daysUntil: number;
} | null {
  const { sourceMonth, sourceDay, localDate, windowDays, leapDayPolicy } = params;
  const base = parseIsoDate(localDate);
  const baseUtcMs = Date.UTC(base.year, base.month - 1, base.day);

  // Check current calendar year and next calendar year (for year-boundary rollover like Dec 30 -> Jan 2)
  for (const candidateYear of [base.year, base.year + 1]) {
    const { observedMonth, observedDay } = resolveObservedMonthDay(
      sourceMonth,
      sourceDay,
      candidateYear,
      leapDayPolicy,
    );
    const targetUtcMs = Date.UTC(candidateYear, observedMonth - 1, observedDay);
    const diffDays = Math.round((targetUtcMs - baseUtcMs) / 86_400_000);
    if (diffDays >= 0 && diffDays <= windowDays) {
      const mm = String(observedMonth).padStart(2, '0');
      const dd = String(observedDay).padStart(2, '0');
      return {
        celebrationYear: candidateYear,
        observedMonth,
        observedDay,
        observedDate: `${candidateYear}-${mm}-${dd}`,
        daysUntil: diffDays,
      };
    }
  }
  return null;
}

@Injectable()
export class CelebrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly config: AppConfig,
  ) {}

  /**
   * HOF-022-S01 & S02: Runs the proactive celebration reminder evaluation for `localDate`
   * (defaults to today in `Africa/Lagos`), upserting one `CelebrationReminder` per
   * `(personId, kind, celebrationYear)` within the lookahead window (default 3 days).
   * Running the scheduler twice on the same date is strictly idempotent.
   */
  async evaluateReminders(
    auth: AuthContext | null,
    opts?: {
      local_date?: string;
      timezone?: string;
      leap_day_policy?: LeapDayPolicy;
      window_days?: number;
    },
  ) {
    const timezone = opts?.timezone || DEFAULT_CHURCH_TIMEZONE;
    const leapDayPolicy: LeapDayPolicy = opts?.leap_day_policy || DEFAULT_LEAP_DAY_POLICY;
    const windowDays = opts?.window_days ?? 3;
    const localDate = opts?.local_date ? opts.local_date.trim() : getLocalIsoDate(new Date(), timezone);
    parseIsoDate(localDate); // validate format & calendar date

    const people = await this.prisma.person.findMany({
      where: {
        OR: [
          { birthMonth: { not: null }, birthDay: { not: null } },
          { anniversaryMonth: { not: null }, anniversaryDay: { not: null } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        membershipStatus: true,
        birthMonth: true,
        birthDay: true,
        anniversaryMonth: true,
        anniversaryDay: true,
      },
    });

    const upsertedIds: string[] = [];

    for (const p of people) {
      const candidates: { kind: CelebrationKind; month: number; day: number }[] = [];
      if (p.birthMonth && p.birthDay) {
        candidates.push({ kind: 'BIRTHDAY', month: p.birthMonth, day: p.birthDay });
      }
      if (p.anniversaryMonth && p.anniversaryDay) {
        candidates.push({ kind: 'ANNIVERSARY', month: p.anniversaryMonth, day: p.anniversaryDay });
      }

      for (const c of candidates) {
        const match = evaluateUpcomingCelebration({
          sourceMonth: c.month,
          sourceDay: c.day,
          localDate,
          windowDays,
          leapDayPolicy,
        });
        if (!match) continue;

        const existing = await this.prisma.celebrationReminder.findUnique({
          where: {
            personId_kind_celebrationYear: {
              personId: p.id,
              kind: c.kind,
              celebrationYear: match.celebrationYear,
            },
          },
        });

        if (existing) {
          const updated = await this.prisma.celebrationReminder.update({
            where: { id: existing.id },
            data: {
              observedMonth: match.observedMonth,
              observedDay: match.observedDay,
              observedDate: match.observedDate,
              daysUntil: match.daysUntil,
              timezone,
              leapDayPolicy,
              lastEvaluatedOn: localDate,
              evaluationCount: { increment: 1 },
            },
          });
          upsertedIds.push(updated.id);
        } else {
          const created = await this.prisma.celebrationReminder.create({
            data: {
              personId: p.id,
              kind: c.kind,
              celebrationYear: match.celebrationYear,
              sourceMonth: c.month,
              sourceDay: c.day,
              observedMonth: match.observedMonth,
              observedDay: match.observedDay,
              observedDate: match.observedDate,
              daysUntil: match.daysUntil,
              timezone,
              leapDayPolicy,
              lastEvaluatedOn: localDate,
              evaluationCount: 1,
            },
          });
          upsertedIds.push(created.id);
        }
      }
    }

    const reminders = await this.prisma.celebrationReminder.findMany({
      where: {
        lastEvaluatedOn: localDate,
        daysUntil: { gte: 0, lte: windowDays },
      },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            photoUrl: true,
            membershipStatus: true,
          },
        },
      },
      orderBy: [{ daysUntil: 'asc' }, { observedMonth: 'asc' }, { observedDay: 'asc' }],
    });

    // Attach celebration contacts for the corresponding (personId, kind, celebrationYear)
    const contacts = await this.prisma.celebrationContact.findMany({
      where: {
        personId: { in: reminders.map((r) => r.personId) },
      },
      orderBy: { createdAt: 'desc' },
    });

    await this.audit.record({
      actorId: auth?.personId ?? null,
      action: 'celebrations.reminders.evaluated',
      metadata: {
        localDate,
        timezone,
        leapDayPolicy,
        windowDays,
        reminderCount: reminders.length,
      },
    });

    return {
      local_date: localDate,
      timezone,
      leap_day_policy: leapDayPolicy,
      window_days: windowDays,
      reminders: reminders.map((r) => {
        const matchingContacts = contacts.filter(
          (c) => c.personId === r.personId && c.kind === r.kind && c.celebrationYear === r.celebrationYear,
        );
        return {
          id: r.id,
          person_id: r.personId,
          kind: r.kind,
          celebration_year: r.celebrationYear,
          source_month: r.sourceMonth,
          source_day: r.sourceDay,
          observed_month: r.observedMonth,
          observed_day: r.observedDay,
          observed_date: r.observedDate,
          days_until: r.daysUntil,
          timezone: r.timezone,
          leap_day_policy: r.leapDayPolicy,
          evaluation_count: r.evaluationCount,
          birth_year: null, // HOF-022-S01: no birth year is required or invented
          person: {
            id: r.person.id,
            first_name: r.person.firstName,
            last_name: r.person.lastName,
            email: r.person.email,
            phone: r.person.phone,
            photo_url: r.person.photoUrl,
            membership_status: r.person.membershipStatus,
          },
          contacts: matchingContacts.map((c) => ({
            id: c.id,
            channel: c.channel,
            outcome: c.outcome,
            note: c.note,
            delivery_status: c.deliveryStatus,
            created_at: c.createdAt.toISOString(),
          })),
        };
      }),
    };
  }

  /**
   * Returns both the proactive 3-day upcoming reminders AND the monthly celebration calendar
   * for a selected month (defaults to the month of `local_date`).
   */
  async getCelebrationsOverview(
    auth: AuthContext,
    opts?: {
      local_date?: string;
      timezone?: string;
      leap_day_policy?: LeapDayPolicy;
      window_days?: number;
      month?: number;
    },
  ) {
    const evaluated = await this.evaluateReminders(auth, opts);
    const parsed = parseIsoDate(evaluated.local_date);
    const targetMonth = opts?.month && opts.month >= 1 && opts.month <= 12 ? opts.month : parsed.month;
    const targetYear = parsed.year;

    const monthlyPeople = await this.prisma.person.findMany({
      where: {
        OR: [{ birthMonth: targetMonth }, { anniversaryMonth: targetMonth }],
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const contactsThisYear = await this.prisma.celebrationContact.findMany({
      where: {
        celebrationYear: { in: [targetYear, targetYear + 1] },
      },
      orderBy: { createdAt: 'desc' },
    });

    const monthlyItems: {
      person_id: string;
      first_name: string;
      last_name: string;
      email: string | null;
      phone: string | null;
      photo_url: string | null;
      membership_status: string;
      kind: CelebrationKind;
      month: number;
      day: number;
      celebration_year: number;
      contacts_count: number;
      last_contact_at: string | null;
    }[] = [];

    for (const p of monthlyPeople) {
      if (p.birthMonth === targetMonth && p.birthDay) {
        const cList = contactsThisYear.filter(
          (c) => c.personId === p.id && c.kind === 'BIRTHDAY' && c.celebrationYear === targetYear,
        );
        monthlyItems.push({
          person_id: p.id,
          first_name: p.firstName,
          last_name: p.lastName,
          email: p.email,
          phone: p.phone,
          photo_url: p.photoUrl,
          membership_status: p.membershipStatus,
          kind: 'BIRTHDAY',
          month: p.birthMonth,
          day: p.birthDay,
          celebration_year: targetYear,
          contacts_count: cList.length,
          last_contact_at: cList[0]?.createdAt.toISOString() ?? null,
        });
      }
      if (p.anniversaryMonth === targetMonth && p.anniversaryDay) {
        const cList = contactsThisYear.filter(
          (c) => c.personId === p.id && c.kind === 'ANNIVERSARY' && c.celebrationYear === targetYear,
        );
        monthlyItems.push({
          person_id: p.id,
          first_name: p.firstName,
          last_name: p.lastName,
          email: p.email,
          phone: p.phone,
          photo_url: p.photoUrl,
          membership_status: p.membershipStatus,
          kind: 'ANNIVERSARY',
          month: p.anniversaryMonth,
          day: p.anniversaryDay,
          celebration_year: targetYear,
          contacts_count: cList.length,
          last_contact_at: cList[0]?.createdAt.toISOString() ?? null,
        });
      }
    }

    monthlyItems.sort((a, b) => a.day - b.day || a.first_name.localeCompare(b.first_name));

    return {
      ...evaluated,
      selected_month: targetMonth,
      monthly_celebrations: monthlyItems,
    };
  }

  /**
   * HOF-022-S04: Records a celebration call or sends an allowed greeting (email / call / WhatsApp).
   * Repeated clicks or retries with the same `idempotency_key` (or same person + kind + year + EMAIL_GREETING)
   * return the existing contact with `duplicate: true` and never send duplicate emails.
   */
  async recordCelebrationContact(
    auth: AuthContext,
    input: {
      person_id: string;
      kind: CelebrationKind;
      celebration_year?: number;
      channel: CelebrationContactChannel;
      outcome?: string;
      note?: string;
      idempotency_key?: string;
    },
  ) {
    const person = await this.prisma.person.findUnique({ where: { id: input.person_id } });
    if (!person) {
      throw new ApiError(404, 'PERSON_NOT_FOUND', 'Person not found.');
    }

    if (input.kind === 'BIRTHDAY' && (!person.birthMonth || !person.birthDay)) {
      throw new ApiError(
        400,
        'CELEBRATION_NOT_CONFIGURED',
        'This person does not have a birthday recorded on their profile.',
      );
    }
    if (input.kind === 'ANNIVERSARY' && (!person.anniversaryMonth || !person.anniversaryDay)) {
      throw new ApiError(
        400,
        'CELEBRATION_NOT_CONFIGURED',
        'This person does not have an anniversary recorded on their profile.',
      );
    }

    const celebrationYear = input.celebration_year ?? new Date().getUTCFullYear();
    const idempotencyKey =
      input.idempotency_key?.trim() ||
      `celebration:${person.id}:${input.kind}:${celebrationYear}:${input.channel}`;

    const existing = await this.prisma.celebrationContact.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return {
        id: existing.id,
        person_id: existing.personId,
        kind: existing.kind,
        celebration_year: existing.celebrationYear,
        channel: existing.channel,
        outcome: existing.outcome,
        note: existing.note,
        delivery_status: existing.deliveryStatus,
        duplicate: true,
        created_at: existing.createdAt.toISOString(),
      };
    }

    let deliveryStatus = 'LOGGED';
    if (input.channel === 'EMAIL_GREETING') {
      if (!person.email) {
        throw new ApiError(
          400,
          'MISSING_EMAIL',
          'Cannot send an email greeting because this person has no email address on file.',
        );
      }
      const tpl = celebrationGreetingEmail({
        firstName: person.firstName,
        kind: input.kind,
        customNote: input.note,
        webUrl: this.config.get('WEB_URL'),
      });
      try {
        await this.email.send({
          to: person.email,
          ...tpl,
          idempotencyKey,
        });
        deliveryStatus = 'SENT';
      } catch {
        deliveryStatus = 'FAILED';
      }
    }

    const created = await this.prisma.celebrationContact.create({
      data: {
        personId: person.id,
        kind: input.kind,
        celebrationYear,
        channel: input.channel,
        outcome: input.outcome?.trim() || (input.channel === 'EMAIL_GREETING' ? 'GREETING_SENT' : 'REACHED'),
        note: input.note?.trim() || null,
        actorPersonId: auth.personId,
        idempotencyKey,
        deliveryStatus,
      },
    });

    await this.audit.record({
      actorId: auth.personId,
      action: 'celebrations.contact.recorded',
      subjectId: person.id,
      metadata: {
        contactId: created.id,
        kind: created.kind,
        celebrationYear: created.celebrationYear,
        channel: created.channel,
        outcome: created.outcome,
        deliveryStatus,
      },
    });

    return {
      id: created.id,
      person_id: created.personId,
      kind: created.kind,
      celebration_year: created.celebrationYear,
      channel: created.channel,
      outcome: created.outcome,
      note: created.note,
      delivery_status: created.deliveryStatus,
      duplicate: false,
      created_at: created.createdAt.toISOString(),
    };
  }

  // ── Life Landmarks & Bulletin Publication (HOF-022-S03) ───────────────────

  /**
   * HOF-022-S03: Records a member's graduation or family milestone on their profile.
   * Recording is strictly separate from bulletin publication: even if the member's
   * `publication_preference` is `ALLOW_BULLETIN`, `approvalStatus` starts as `PENDING`
   * until an authorized reviewer approves it.
   */
  async createLandmark(
    auth: AuthContext,
    input: {
      person_id: string;
      category: LandmarkCategory;
      title: string;
      description?: string | null;
      occurred_on?: string | null;
      publication_preference?: LandmarkPublicationPreference;
    },
  ) {
    const person = await this.prisma.person.findUnique({ where: { id: input.person_id } });
    if (!person) {
      throw new ApiError(404, 'PERSON_NOT_FOUND', 'Person not found.');
    }

    const landmark = await this.prisma.lifeLandmark.create({
      data: {
        personId: person.id,
        category: input.category,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        occurredOn: input.occurred_on?.trim() || null,
        publicationPreference: input.publication_preference ?? 'PRIVATE',
        approvalStatus: 'PENDING',
        recordedById: auth.personId,
      },
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, membershipStatus: true },
        },
      },
    });

    await this.audit.record({
      actorId: auth.personId,
      action: 'landmarks.recorded',
      subjectId: person.id,
      metadata: {
        landmarkId: landmark.id,
        category: landmark.category,
        publicationPreference: landmark.publicationPreference,
        approvalStatus: landmark.approvalStatus,
      },
    });

    return this.toLandmarkResponse(landmark);
  }

  /**
   * Lists all recorded landmarks for authorized internal viewers (`celebrations.read`).
   */
  async listLandmarks(filter?: {
    personId?: string;
    approvalStatus?: LandmarkApprovalStatus;
  }) {
    const items = await this.prisma.lifeLandmark.findMany({
      where: {
        ...(filter?.personId ? { personId: filter.personId } : {}),
        ...(filter?.approvalStatus ? { approvalStatus: filter.approvalStatus } : {}),
      },
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, membershipStatus: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((l) => this.toLandmarkResponse(l));
  }

  /**
   * HOF-022-S03: Updates the publication preference or approval status of a landmark.
   * Approving a `PRIVATE` landmark for the public bulletin is rejected unless
   * `publication_preference` is `ALLOW_BULLETIN`.
   */
  async reviewLandmark(
    auth: AuthContext,
    landmarkId: string,
    input: {
      publication_preference?: LandmarkPublicationPreference;
      approval_status?: LandmarkApprovalStatus;
      review_note?: string | null;
    },
  ) {
    const existing = await this.prisma.lifeLandmark.findUnique({
      where: { id: landmarkId },
    });
    if (!existing) {
      throw new ApiError(404, 'LANDMARK_NOT_FOUND', 'Life landmark not found.');
    }

    const nextPreference = input.publication_preference ?? existing.publicationPreference;
    let nextApproval = input.approval_status ?? existing.approvalStatus;

    if (nextApproval === 'APPROVED' && nextPreference !== 'ALLOW_BULLETIN') {
      throw new ApiError(
        400,
        'PUBLICATION_PREFERENCE_REQUIRED',
        'Cannot approve a landmark for the public bulletin when publication_preference is PRIVATE.',
      );
    }

    // If preference is switched back to PRIVATE, it can no longer be published in the bulletin.
    if (nextPreference === 'PRIVATE' && nextApproval === 'APPROVED' && !input.approval_status) {
      nextApproval = 'PENDING';
    }

    const updated = await this.prisma.lifeLandmark.update({
      where: { id: landmarkId },
      data: {
        publicationPreference: nextPreference,
        approvalStatus: nextApproval,
        reviewedById: input.approval_status ? auth.personId : existing.reviewedById,
        reviewedAt: input.approval_status ? new Date() : existing.reviewedAt,
        reviewNote: input.review_note !== undefined ? input.review_note?.trim() || null : existing.reviewNote,
      },
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, membershipStatus: true },
        },
      },
    });

    await this.audit.record({
      actorId: auth.personId,
      action: 'landmarks.reviewed',
      subjectId: updated.personId,
      metadata: {
        landmarkId: updated.id,
        publicationPreference: updated.publicationPreference,
        approvalStatus: updated.approvalStatus,
      },
    });

    return this.toLandmarkResponse(updated);
  }

  /**
   * HOF-022-S03: Returns ONLY landmarks that have BOTH `publicationPreference = ALLOW_BULLETIN`
   * AND `approvalStatus = APPROVED`.
   */
  async listPublicBulletinLandmarks() {
    const items = await this.prisma.lifeLandmark.findMany({
      where: {
        publicationPreference: 'ALLOW_BULLETIN',
        approvalStatus: 'APPROVED',
      },
      include: {
        person: {
          select: { id: true, firstName: true, lastName: true, membershipStatus: true },
        },
      },
      orderBy: [{ reviewedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return items.map((l) => this.toLandmarkResponse(l));
  }

  private toLandmarkResponse(l: {
    id: string;
    personId: string;
    category: LandmarkCategory;
    title: string;
    description: string | null;
    occurredOn: string | null;
    publicationPreference: LandmarkPublicationPreference;
    approvalStatus: LandmarkApprovalStatus;
    recordedById: string;
    reviewedById: string | null;
    reviewedAt: Date | null;
    reviewNote: string | null;
    createdAt: Date;
    person: {
      id: string;
      firstName: string;
      lastName: string;
      membershipStatus: string;
    };
  }) {
    return {
      id: l.id,
      person_id: l.personId,
      category: l.category,
      title: l.title,
      description: l.description,
      occurred_on: l.occurredOn,
      publication_preference: l.publicationPreference,
      approval_status: l.approvalStatus,
      in_public_bulletin: l.publicationPreference === 'ALLOW_BULLETIN' && l.approvalStatus === 'APPROVED',
      recorded_by_id: l.recordedById,
      reviewed_by_id: l.reviewedById,
      reviewed_at: l.reviewedAt?.toISOString() ?? null,
      review_note: l.reviewNote,
      created_at: l.createdAt.toISOString(),
      person: {
        id: l.person.id,
        first_name: l.person.firstName,
        last_name: l.person.lastName,
        membership_status: l.person.membershipStatus,
      },
    };
  }
}
