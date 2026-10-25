import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditService } from '../../platform/audit/audit.module.js';
import { AppConfig } from '../../platform/config/config.module.js';
import { PrismaService } from '../../platform/database/prisma.module.js';
import { EmailService } from '../../platform/email/email.module.js';
import { pastoralPrayerRequestEmail } from '../../platform/email/templates.js';
import { ApiError } from '../../platform/http/errors.js';
import type { AuthContext } from '../identity/auth.guard.js';

@Injectable()
export class PrayerNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly config: AppConfig,
  ) {}

  async list() {
    const notes = await this.prisma.prayerNote.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            membershipStatus: true,
          },
        },
        serviceOccurrence: {
          select: {
            id: true,
            title: true,
            serviceDate: true,
          },
        },
      },
    });

    // Batch resolve creator and sender names
    const creatorIds = [
      ...new Set([
        ...notes.map((n) => n.createdById),
        ...notes.map((n) => n.sentToPastorById).filter((id): id is string => Boolean(id)),
      ]),
    ];
    const creators = creatorIds.length
      ? await this.prisma.person.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const nameMap = new Map(creators.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

    return notes.map((n) => ({
      id: n.id,
      content: n.content,
      created_at: n.createdAt.toISOString(),
      updated_at: n.updatedAt.toISOString(),
      created_by_name: nameMap.get(n.createdById) ?? 'Steward',
      sent_to_pastor_at: n.sentToPastorAt?.toISOString() ?? null,
      sent_to_pastor_by_name: n.sentToPastorById ? (nameMap.get(n.sentToPastorById) ?? 'Membership Lead') : null,
      person: {
        id: n.person.id,
        first_name: n.person.firstName,
        last_name: n.person.lastName,
        phone: n.person.phone,
        email: n.person.email,
        membership_status: n.person.membershipStatus,
      },
      service_occurrence: n.serviceOccurrence
        ? {
            id: n.serviceOccurrence.id,
            title: n.serviceOccurrence.title,
            service_date: n.serviceOccurrence.serviceDate.toISOString(),
          }
        : null,
    }));
  }

  async update(actor: AuthContext, id: string, content: string) {
    const existing = await this.prisma.prayerNote.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PRAYER_NOTE_NOT_FOUND', 'Prayer note not found.');
    }

    const updated = await this.prisma.prayerNote.update({
      where: { id },
      data: { content: content.trim() },
    });

    await this.audit.record({
      action: 'prayer_notes.updated',
      actorId: actor.personId,
      subjectId: id,
      metadata: { personId: existing.personId },
    });

    return { id: updated.id, content: updated.content, updated_at: updated.updatedAt.toISOString() };
  }

  async sendToPastor(actor: AuthContext, id: string) {
    const note = await this.prisma.prayerNote.findUnique({
      where: { id },
      include: {
        person: true,
        serviceOccurrence: true,
      },
    });

    if (!note) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'PRAYER_NOTE_NOT_FOUND', 'Prayer note not found.');
    }

    // Resolve Resident Pastor recipient
    const pastorAssignment = await this.prisma.assignment.findFirst({
      where: { role: 'PASTOR', endedAt: null },
      include: { person: { include: { account: true } } },
    });

    const pastorEmail =
      pastorAssignment?.person.account?.loginEmail ||
      process.env.PASTOR_EMAIL ||
      process.env.SEED_ADMIN_EMAIL ||
      'pastor@heritagemmc.site';

    // Resolve sender's name
    const sender = await this.prisma.person.findUnique({ where: { id: actor.personId } });
    const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Membership Team Lead';

    const mail = pastoralPrayerRequestEmail({
      visitorName: `${note.person.firstName} ${note.person.lastName}`,
      visitorPhone: note.person.phone,
      visitorEmail: note.person.email,
      serviceTitle: note.serviceOccurrence?.title,
      formattedContent: note.content,
      senderName,
      webUrl: this.config.get('WEB_URL'),
    });

    await this.email.send({
      to: pastorEmail,
      ...mail,
    });

    const updated = await this.prisma.prayerNote.update({
      where: { id },
      data: {
        sentToPastorAt: new Date(),
        sentToPastorById: actor.personId,
      },
    });

    await this.audit.record({
      action: 'prayer_notes.sent_to_pastor',
      actorId: actor.personId,
      subjectId: id,
      metadata: {
        recipientEmail: pastorEmail,
        personId: note.personId,
        sentToPastorAt: updated.sentToPastorAt?.toISOString(),
      },
    });

    return {
      id: updated.id,
      sent_to_pastor_at: updated.sentToPastorAt?.toISOString() ?? null,
      recipient: pastorEmail,
    };
  }
}
