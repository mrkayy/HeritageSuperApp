import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/platform/database/prisma.module.js';
import { EmailService, type OutboundEmail } from '../src/platform/email/email.module.js';

/**
 * End-to-end acceptance suite covering:
 * - HOF-001: Sign-in, sessions & logout
 * - HOF-002: Controlled claims, magic links & onboarding
 * - HOF-010 & HOF-012: Canonical Person & unified Directory search
 * - HOF-013: Information Center visitor intake, duplicate detection, missing-contact reason & separate prayer notes
 * - HOF-014: Service occurrences & idempotent attendance check-ins
 * - HOF-016: Follow-up allocation, honest call outcomes & pastoral visit flags
 */
describe('Heritage Single-Church MVP E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const sentEmails: OutboundEmail[] = [];

  const ORIGIN = 'http://localhost:3000';
  const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'securesuperadmin@heritagemmc.site';
  const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? '$SecureSuperHMMCAdmin2026';

  let adminCookie: string[];
  let stewardCookie: string[];
  let stewardPersonId: string;
  let occurrenceId: string;
  let capturedVisitorId: string;
  let followUpTaskId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({
        send: async (mail: OutboundEmail) => {
          sentEmails.push(mail);
          return { id: 'mock-email-id' };
        },
      })
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.account.deleteMany({
      where: { loginEmail: { in: ['steward.test@example.com', 'visitor.ade@example.com'] } },
    });
    await prisma.person.deleteMany({
      where: {
        OR: [
          { email: { in: ['steward.test@example.com', 'visitor.ade@example.com'] } },
          { firstName: 'Mama', lastName: 'Bolanle' },
        ],
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('HOF-001-S02: rejects unknown accounts and wrong passwords with the same non-enumerating 401', async () => {
    const unknown = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: 'nobody@example.com', password: 'WrongPassword123' });

    const wrongPass = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: ADMIN_EMAIL, password: 'WrongPassword123' });

    expect(unknown.status).toBe(401);
    expect(wrongPass.status).toBe(401);
    expect(unknown.body.code).toBe('INVALID_CREDENTIALS');
    expect(wrongPass.body.code).toBe(unknown.body.code);
  });

  it('HOF-001-S01: signs in the church admin with an HttpOnly session cookie and resolves /api/auth/me', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    expect(loginRes.status).toBe(200);
    adminCookie = loginRes.headers['set-cookie'] as unknown as string[];
    expect(adminCookie?.some((c) => c.startsWith('hof_session=') && c.includes('HttpOnly'))).toBe(true);

    const meRes = await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', adminCookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(ADMIN_EMAIL);
    expect(meRes.body.capabilities).toContain('stewards.invite');
    expect(meRes.body.capabilities).toContain('visitors.capture');
  });

  it('HOF-002-S01 & S04: invites a steward via Resend, previews safely on GET, and atomically claims once on POST', async () => {
    const teamsRes = await request(app.getHttpServer()).get('/api/teams').set('Cookie', adminCookie);
    expect(teamsRes.status).toBe(200);
    const infoCenter = (teamsRes.body as { id: string; key: string }[]).find((t) => t.key === 'information_center')!;

    sentEmails.length = 0;
    const inviteRes = await request(app.getHttpServer())
      .post('/api/stewards/invitations')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        first_name: 'Grace',
        last_name: 'Okafor',
        email: 'steward.test@example.com',
        role: 'STEWARD',
        team_id: infoCenter.id,
      });

    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.invitation.delivery).toBe('SENT');
    expect(sentEmails).toHaveLength(1);

    const match = sentEmails[0].text.match(/token=([A-Za-z0-9_-]+)/);
    const claimToken = decodeURIComponent(match![1]);

    // GET preview twice (mail scanner + browser) — does not consume token
    const inspect1 = await request(app.getHttpServer()).get(`/api/auth/claims/inspect?token=${claimToken}`);
    const inspect2 = await request(app.getHttpServer()).get(`/api/auth/claims/inspect?token=${claimToken}`);
    expect(inspect1.status).toBe(200);
    expect(inspect2.status).toBe(200);

    // Concurrent POST race: only one succeeds
    const [claimA, claimB] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/auth/claims/complete')
        .set('Origin', ORIGIN)
        .send({ token: claimToken, password: 'StewardPassword1' }),
      request(app.getHttpServer())
        .post('/api/auth/claims/complete')
        .set('Origin', ORIGIN)
        .send({ token: claimToken, password: 'StewardPassword1' }),
    ]);

    expect([claimA.status, claimB.status].sort()).toEqual([200, 410]);
    const winner = claimA.status === 200 ? claimA : claimB;
    stewardCookie = winner.headers['set-cookie'] as unknown as string[];

    const stewardMe = await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', stewardCookie);
    expect(stewardMe.status).toBe(200);
    stewardPersonId = stewardMe.body.person_id;
  });

  it('HOF-013-S01..S04: captures first-timer visitor, stores prayer note separately, queues follow-up, and sends welcome email', async () => {
    const occRes = await request(app.getHttpServer()).get('/api/attendance/occurrences').set('Cookie', stewardCookie);
    expect(occRes.status).toBe(200);
    occurrenceId = occRes.body[0].id;

    sentEmails.length = 0;
    const captureRes = await request(app.getHttpServer())
      .post('/api/people/visitor-intakes')
      .set('Origin', ORIGIN)
      .set('Cookie', stewardCookie)
      .send({
        first_name: 'Ade',
        last_name: 'Balogun',
        phone: '+2348031234567',
        email: 'visitor.ade@example.com',
        service_occurrence_id: occurrenceId,
        prayer_request: 'Confidential prayer for family healing',
        birth_month: 10,
        birth_day: 25,
      });

    expect(captureRes.status).toBe(201);
    expect(captureRes.body.is_new_person).toBe(true);
    expect(captureRes.body.welcome_email_delivery).toBe('SENT');
    expect(sentEmails).toHaveLength(1);
    capturedVisitorId = captureRes.body.person_id;
    followUpTaskId = captureRes.body.followup_task_id;

    // HOF-013-S02: Candidate search finds the visitor with masked contact
    const candRes = await request(app.getHttpServer())
      .get('/api/people/candidates?phone=8031234567')
      .set('Cookie', stewardCookie);
    expect(candRes.status).toBe(200);
    expect(candRes.body.some((c: { id: string }) => c.id === capturedVisitorId)).toBe(true);

    // HOF-013-S03: Visitor without phone/email can be saved when missing_contact_reason is supplied
    const noPhoneRes = await request(app.getHttpServer())
      .post('/api/people/visitor-intakes')
      .set('Origin', ORIGIN)
      .set('Cookie', stewardCookie)
      .send({
        first_name: 'Mama',
        last_name: 'Bolanle',
        missing_contact_reason: 'Elderly visitor brought by neighbour',
        service_occurrence_id: occurrenceId,
      });
    expect(noPhoneRes.status).toBe(201);

    // HOF-013-S04: Directory search returns visitor but never exposes confidential prayer_request body
    const dirRes = await request(app.getHttpServer())
      .get('/api/people?search=Balogun')
      .set('Cookie', stewardCookie);
    expect(dirRes.status).toBe(200);
    expect(dirRes.body).toHaveLength(1);
    expect(JSON.stringify(dirRes.body)).not.toContain('Confidential prayer');
  });

  it('HOF-014-S01: marks attendance idempotently per (occurrence, person) without duplicate inflation', async () => {
    const [checkA, checkB] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/attendance/occurrences/${occurrenceId}/check-ins`)
        .set('Origin', ORIGIN)
        .set('Cookie', stewardCookie)
        .send({ person_id: capturedVisitorId }),
      request(app.getHttpServer())
        .post(`/api/attendance/occurrences/${occurrenceId}/check-ins`)
        .set('Origin', ORIGIN)
        .set('Cookie', stewardCookie)
        .send({ person_id: capturedVisitorId }),
    ]);

    expect(checkA.status).toBe(200);
    expect(checkB.status).toBe(200);
    expect(checkA.body.already_present).toBe(true);
    expect(checkB.body.already_present).toBe(true);

    const rosterRes = await request(app.getHttpServer())
      .get(`/api/attendance/occurrences/${occurrenceId}`)
      .set('Cookie', stewardCookie);
    const matching = rosterRes.body.attendees.filter(
      (a: { person_id: string }) => a.person_id === capturedVisitorId,
    );
    expect(matching).toHaveLength(1);
  });

  it('HOF-016-S01 & S02: assigns visitor to steward, keeps task IN_PROGRESS on UNREACHABLE, and completes on REACHED', async () => {
    // Admin assigns the task to the steward
    const assignRes = await request(app.getHttpServer())
      .post(`/api/follow-ups/${followUpTaskId}/assign`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ assignee_person_id: stewardPersonId });
    expect(assignRes.status).toBe(200);

    // Steward sees the assigned visitor in their queue
    const myQueue = await request(app.getHttpServer())
      .get('/api/follow-ups?scope=mine')
      .set('Cookie', stewardCookie);
    expect(myQueue.status).toBe(200);
    expect(myQueue.body.some((t: { id: string }) => t.id === followUpTaskId)).toBe(true);

    // HOF-016-S02: Logging UNREACHABLE keeps task IN_PROGRESS even if mark_completed=true was sent
    const unreachableRes = await request(app.getHttpServer())
      .post(`/api/follow-ups/${followUpTaskId}/outcomes`)
      .set('Origin', ORIGIN)
      .set('Cookie', stewardCookie)
      .send({
        outcome: 'UNREACHABLE',
        note: 'Phone rang out twice',
        mark_completed: true,
      });
    expect(unreachableRes.status).toBe(201);
    expect(unreachableRes.body.status).toBe('IN_PROGRESS');

    // Logging REACHED with mark_completed=true completes the task and flags pastoral visit
    const reachedRes = await request(app.getHttpServer())
      .post(`/api/follow-ups/${followUpTaskId}/outcomes`)
      .set('Origin', ORIGIN)
      .set('Cookie', stewardCookie)
      .send({
        outcome: 'REACHED',
        note: 'Spoke with Bro Ade, excited to join Foundation Class next Sunday',
        needs_pastoral_visit: true,
        mark_completed: true,
      });
    expect(reachedRes.status).toBe(201);
    expect(reachedRes.body.status).toBe('COMPLETED');
    expect(reachedRes.body.needs_pastoral_visit).toBe(true);
  });

  it('HOF-001-S04: suspending a steward immediately revokes their active session', async () => {
    const suspendRes = await request(app.getHttpServer())
      .post(`/api/stewards/${stewardPersonId}/suspend`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie);
    expect(suspendRes.status).toBe(200);

    const afterSuspend = await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', stewardCookie);
    expect(afterSuspend.status).toBe(401);
  });
});
