import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { ThrottlerGuard } from '@nestjs/throttler';
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
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
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
    await prisma.importJob.deleteMany({});
    await prisma.account.deleteMany({
      where: {
        loginEmail: {
          in: ['steward.test@example.com', 'visitor.ade@example.com', 'csv.chioma@example.com'],
        },
      },
    });
    await prisma.person.deleteMany({
      where: {
        OR: [
          {
            email: {
              in: ['steward.test@example.com', 'visitor.ade@example.com', 'csv.chioma@example.com'],
            },
          },
          { firstName: 'Mama', lastName: 'Bolanle' },
          { firstName: 'Chioma', lastName: 'Nwosu' },
          { firstName: 'JanTwo', lastName: 'Celebrant' },
          { firstName: 'LeapDay', lastName: 'Celebrant' },
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
    const teamsRes = await request(app.getHttpServer()).get('/api/teams').set('Cookie', adminCookie);
    const membershipTeam = (teamsRes.body as { id: string; key: string }[]).find((t) => t.key === 'membership')!;
    await prisma.assignment.create({
      data: {
        personId: stewardPersonId,
        role: 'STEWARD',
        teamId: membershipTeam.id,
      },
    });

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

  it('HOF-002-S01: requires verified Person before claim invite, supports photo + PIN wizard, and grants baseline permissions with zero inferred ministry role', async () => {
    // 1. Attempting to issue a claim invitation for an unverified Person is rejected with 422 PERSON_NOT_VERIFIED
    const unverifiedInvite = await request(app.getHttpServer())
      .post(`/api/people/${capturedVisitorId}/claim-invitations`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({});
    expect(unverifiedInvite.status).toBe(422);
    expect(unverifiedInvite.body.code).toBe('PERSON_NOT_VERIFIED');

    // 2. Verify the Person record explicitly
    const verifyRes = await request(app.getHttpServer())
      .post(`/api/people/${capturedVisitorId}/verifications`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.is_verified).toBe(true);

    // 3. Issue a baseline member claim invitation (no role / no team)
    sentEmails.length = 0;
    const claimInviteRes = await request(app.getHttpServer())
      .post(`/api/people/${capturedVisitorId}/claim-invitations`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({});
    expect(claimInviteRes.status).toBe(201);
    expect(claimInviteRes.body.delivery).toBe('SENT');
    expect(sentEmails).toHaveLength(1);

    const match = sentEmails[0].text.match(/token=([A-Za-z0-9_-]+)/);
    const memberClaimToken = decodeURIComponent(match![1]);

    // 4. Inspect token returns verified status and empty appointments
    const inspectRes = await request(app.getHttpServer()).get(
      `/api/auth/claims/inspect?token=${memberClaimToken}`,
    );
    expect(inspectRes.status).toBe(200);
    expect(inspectRes.body.is_verified).toBe(true);
    expect(inspectRes.body.appointments).toEqual([]);

    // 5. Completing claim with identity_confirmed=false fails with 422 IDENTITY_CONFIRMATION_REQUIRED
    const unconfirmedClaim = await request(app.getHttpServer())
      .post('/api/auth/claims/complete')
      .set('Origin', ORIGIN)
      .send({
        token: memberClaimToken,
        password: 'MemberSecurePassword1',
        identity_confirmed: false,
      });
    expect(unconfirmedClaim.status).toBe(422);
    expect(unconfirmedClaim.body.code).toBe('IDENTITY_NOT_CONFIRMED');

    // 6. Complete claim with identity_confirmed, member photo, and 4-digit PIN
    const samplePhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const completeRes = await request(app.getHttpServer())
      .post('/api/auth/claims/complete')
      .set('Origin', ORIGIN)
      .send({
        token: memberClaimToken,
        password: 'MemberSecurePassword1',
        identity_confirmed: true,
        photo_url: samplePhoto,
        pin: '4826',
      });
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.ok).toBe(true);
    const memberCookie = completeRes.headers['set-cookie'] as unknown as string[];

    const memberMe = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', memberCookie);
    expect(memberMe.status).toBe(200);
    expect(memberMe.body.photo_url).toBe(samplePhoto);
    expect(memberMe.body.has_pin).toBe(true);
    expect(memberMe.body.assignments).toEqual([]);
    expect(memberMe.body.baseline_capabilities).toEqual(
      expect.arrayContaining(['self.profile.read', 'self.profile.write', 'self.journey.read']),
    );
    expect(memberMe.body.capabilities).toEqual(
      expect.arrayContaining(['self.profile.read', 'self.profile.write', 'self.journey.read']),
    );
    expect(memberMe.body.capabilities).not.toContain('stewards.invite');
  });

  it('HOF-012-S02..S04: previews CSV without creating records, commits row-idempotently on retry, and reports applied/failed/review_required separately', async () => {
    const csvText = [
      'first_name,last_name,phone,email,membership_status',
      'Chioma,Nwosu,+2348091112233,csv.chioma@example.com,MEMBER',
      ',MissingFirst,+2348091112244,not-an-email,MEMBER',
      'AdeDuplicate,Balogun,+2348031234567,visitor.ade@example.com,MEMBER',
    ].join('\n');

    // 1. Preview upload (HOF-012-S02) — does not create any Person record yet
    const previewRes = await request(app.getHttpServer())
      .post('/api/people/import-jobs')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ file_name: 'sunday-batch.csv', csv_text: csvText });

    expect(previewRes.status).toBe(201);
    expect(previewRes.body.status).toBe('PREVIEW');
    expect(previewRes.body.summary).toEqual({
      total_rows: 3,
      ready_count: 1,
      applied_count: 0,
      failed_count: 1,
      review_required_count: 1,
    });

    const jobId = previewRes.body.id as string;

    // Confirm Chioma does NOT exist in the directory before commit
    const beforeCommitDir = await request(app.getHttpServer())
      .get('/api/people?search=Chioma')
      .set('Cookie', adminCookie);
    expect(beforeCommitDir.body).toHaveLength(0);

    // 2. Commit the job and retry the exact same commit (HOF-012-S03: lost response retry)
    const commit1 = await request(app.getHttpServer())
      .post(`/api/people/import-jobs/${jobId}/commit`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ idempotency_key: `commit-${jobId}` });

    const commit2 = await request(app.getHttpServer())
      .post(`/api/people/import-jobs/${jobId}/commit`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ idempotency_key: `commit-${jobId}` });

    expect(commit1.status).toBe(200);
    expect(commit2.status).toBe(200);

    // Both responses report identical separated buckets: 1 applied, 1 failed, 1 review_required
    for (const res of [commit1, commit2]) {
      expect(res.body.status).toBe('COMMITTED');
      expect(res.body.summary).toEqual({
        total_rows: 3,
        ready_count: 0,
        applied_count: 1,
        failed_count: 1,
        review_required_count: 1,
      });
      expect(res.body.buckets.applied).toHaveLength(1);
      expect(res.body.buckets.failed).toHaveLength(1);
      expect(res.body.buckets.review_required).toHaveLength(1);
    }

    // 3. Verify Chioma was created exactly once despite the retried commit
    const afterCommitDir = await request(app.getHttpServer())
      .get('/api/people?search=Chioma')
      .set('Cookie', adminCookie);
    expect(afterCommitDir.body).toHaveLength(1);
    expect(afterCommitDir.body[0].email).toBe('csv.chioma@example.com');

    // 4. Verify the duplicate row matching verified Ade Balogun was held in review_required and did not overwrite Ade's first name (HOF-012-S04)
    const adeDir = await request(app.getHttpServer())
      .get('/api/people?search=Balogun')
      .set('Cookie', adminCookie);
    expect(adeDir.body).toHaveLength(1);
    expect(adeDir.body[0].first_name).toBe('Ade');
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

  it('RBAC & RLS Policies: enforces Information Center attendance, Membership Lead prayer notes, and Assistant Lead follow-up assignment', async () => {
    const nonce = Date.now();
    // 1. Fetch teams
    const infoCenterTeam = await prisma.team.findUniqueOrThrow({ where: { key: 'information_center' } });
    const membershipTeam = await prisma.team.findUniqueOrThrow({ where: { key: 'membership' } });

    // 2. Create Membership Steward (no Information Center)
    const memStewardEmail = `mem.steward.${nonce}@example.com`;
    const memStewardRes = await request(app.getHttpServer())
      .post('/api/stewards/invitations')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        first_name: 'Membership',
        last_name: 'Steward',
        email: memStewardEmail,
        role: 'STEWARD',
        team_id: membershipTeam.id,
      });
    expect(memStewardRes.status).toBe(201);
    const memStewardId = memStewardRes.body.person_id;
    const memClaimMail = sentEmails.find((m) => m.to === memStewardEmail)!;
    const memClaimToken = decodeURIComponent(memClaimMail.text.match(/token=([A-Za-z0-9_-]+)/)![1]);
    const memClaimComplete = await request(app.getHttpServer())
      .post('/api/auth/claims/complete')
      .set('Origin', ORIGIN)
      .send({ token: memClaimToken, password: 'SecurePassword123' });
    expect(memClaimComplete.status).toBe(200);
    const memStewardCookie = memClaimComplete.headers['set-cookie'] as unknown as string[];

    // 3. Membership Steward attempts to record attendance -> 403 Forbidden (Information Center only)
    const forbiddenAttendance = await request(app.getHttpServer())
      .post(`/api/attendance/occurrences/${occurrenceId}/check-ins`)
      .set('Origin', ORIGIN)
      .set('Cookie', memStewardCookie)
      .send({ person_id: memStewardId });
    expect(forbiddenAttendance.status).toBe(403);
    expect(forbiddenAttendance.body.code).toBe('FORBIDDEN');

    // 4. Membership Steward attempts to access prayer notes -> 403 Forbidden
    const forbiddenPrayerNotes = await request(app.getHttpServer())
      .get('/api/prayer-notes')
      .set('Cookie', memStewardCookie);
    expect(forbiddenPrayerNotes.status).toBe(403);

    // 5. Create Assistant Team Lead in Membership
    const asstLeadEmail = `asst.lead.${nonce}@example.com`;
    const asstLeadRes = await request(app.getHttpServer())
      .post('/api/stewards/invitations')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        first_name: 'Assistant',
        last_name: 'Lead',
        email: asstLeadEmail,
        role: 'ASSISTANT_TEAM_LEAD',
        team_id: membershipTeam.id,
      });
    expect(asstLeadRes.status).toBe(201);
    const asstLeadId = asstLeadRes.body.person_id;
    const asstClaimMail = sentEmails.find((m) => m.to === asstLeadEmail)!;
    const asstClaimToken = decodeURIComponent(asstClaimMail.text.match(/token=([A-Za-z0-9_-]+)/)![1]);
    const asstClaimComplete = await request(app.getHttpServer())
      .post('/api/auth/claims/complete')
      .set('Origin', ORIGIN)
      .send({ token: asstClaimToken, password: 'SecurePassword123' });
    expect(asstClaimComplete.status).toBe(200);
    const asstLeadCookie = asstClaimComplete.headers['set-cookie'] as unknown as string[];

    // 6. Assistant Team Lead assigns follow-up task -> 200 OK + audit trail verification
    const assignByAsst = await request(app.getHttpServer())
      .post(`/api/follow-ups/${followUpTaskId}/assign`)
      .set('Origin', ORIGIN)
      .set('Cookie', asstLeadCookie)
      .send({ assignee_person_id: memStewardId });
    expect(assignByAsst.status).toBe(200);
    expect(assignByAsst.body.assignee_person_id).toBe(memStewardId);
    expect(assignByAsst.body.assigned_by_id).toBe(asstLeadId);

    const taskAudit = await prisma.auditEvent.findFirst({
      where: { action: 'followups.assigned', subjectId: followUpTaskId },
      orderBy: { createdAt: 'desc' },
    });
    expect(taskAudit).not.toBeNull();
    expect(taskAudit?.actorId).toBe(asstLeadId);
    expect((taskAudit?.metadata as Record<string, unknown>)?.newAssigneeId).toBe(memStewardId);

    // 7. Create Membership Team Lead
    const memLeadEmail = `mem.lead.${nonce}@example.com`;
    const memLeadRes = await request(app.getHttpServer())
      .post('/api/stewards/invitations')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        first_name: 'Membership',
        last_name: 'Lead',
        email: memLeadEmail,
        role: 'TEAM_LEAD',
        team_id: membershipTeam.id,
      });
    expect(memLeadRes.status).toBe(201);
    const memLeadClaimMail = sentEmails.find((m) => m.to === memLeadEmail)!;
    const memLeadClaimToken = decodeURIComponent(memLeadClaimMail.text.match(/token=([A-Za-z0-9_-]+)/)![1]);
    const memLeadClaimComplete = await request(app.getHttpServer())
      .post('/api/auth/claims/complete')
      .set('Origin', ORIGIN)
      .send({ token: memLeadClaimToken, password: 'SecurePassword123' });
    expect(memLeadClaimComplete.status).toBe(200);
    const memLeadCookie = memLeadClaimComplete.headers['set-cookie'] as unknown as string[];

    // 8. Membership Team Lead accesses prayer notes, formats request, and sends to Resident Pastor
    const prayerNotesList = await request(app.getHttpServer())
      .get('/api/prayer-notes')
      .set('Cookie', memLeadCookie);
    expect(prayerNotesList.status).toBe(200);
    expect(prayerNotesList.body.length).toBeGreaterThan(0);
    const targetPrayerNote = prayerNotesList.body[0];

    // Format / Edit prayer note
    const editRes = await request(app.getHttpServer())
      .patch(`/api/prayer-notes/${targetPrayerNote.id}`)
      .set('Origin', ORIGIN)
      .set('Cookie', memLeadCookie)
      .send({ content: 'Formatted: Please pray for divine job placement and peace during transition.' });
    expect(editRes.status).toBe(200);
    expect(editRes.body.content).toContain('Formatted:');

    // Send formatted prayer note to Resident Pastor
    const sendPastorRes = await request(app.getHttpServer())
      .post(`/api/prayer-notes/${targetPrayerNote.id}/send-pastor`)
      .set('Origin', ORIGIN)
      .set('Cookie', memLeadCookie);
    expect(sendPastorRes.status).toBe(200);
    expect(sendPastorRes.body.sent_to_pastor_at).not.toBeNull();

    // Verify outbound email to pastor
    const pastorMail = sentEmails.find((m) => m.subject.includes('[Confidential Prayer Request]'));
    expect(pastorMail).toBeDefined();
    expect(pastorMail?.html).toContain('Membership Team Lead');
    expect(pastorMail?.html).toContain('Formatted: Please pray for divine job placement');
  });

  it('HOF-003-S04: unlinking an external auth method requires reauthentication and preserves at least one usable method', async () => {
    // 1. Link a Google auth method to the admin account (which also has a password)
    const linkRes = await request(app.getHttpServer())
      .post('/api/auth/methods/link')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        provider: 'google',
        provider_sub: 'google-oauth2|10987654321',
        provider_email: ADMIN_EMAIL,
      });
    expect(linkRes.status).toBe(201);
    const methodId = linkRes.body.id as string;

    // 2. Attempting to unlink without reauthentication fails with 401 REAUTHENTICATION_REQUIRED
    const noReauth = await request(app.getHttpServer())
      .delete(`/api/auth/methods/${methodId}`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({});
    expect(noReauth.status).toBe(401);
    expect(noReauth.body.code).toBe('REAUTHENTICATION_REQUIRED');

    // 3. Unlinking with valid password succeeds because passwordHash remains usable
    const validUnlink = await request(app.getHttpServer())
      .delete(`/api/auth/methods/${methodId}`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ password: ADMIN_PASSWORD });
    expect(validUnlink.status).toBe(200);
    expect(validUnlink.body.ok).toBe(true);

    // 4. Re-link Google, temporarily remove passwordHash (leaving only PIN + Google), and attempt to unlink Google
    const relinkRes = await request(app.getHttpServer())
      .post('/api/auth/methods/link')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        provider: 'google',
        provider_sub: 'google-oauth2|10987654321',
        provider_email: ADMIN_EMAIL,
      });
    const relinkedId = relinkRes.body.id as string;

    const adminAccount = await prisma.account.findUniqueOrThrow({ where: { loginEmail: ADMIN_EMAIL } });
    const savedPasswordHash = adminAccount.passwordHash;
    await prisma.account.update({
      where: { id: adminAccount.id },
      data: { passwordHash: null },
    });

    try {
      // Even when session is fresh, removing the final usable login method is refused with 422 LAST_AUTH_METHOD_CANNOT_BE_REMOVED
      const lastMethodUnlink = await request(app.getHttpServer())
        .delete(`/api/auth/methods/${relinkedId}`)
        .set('Origin', ORIGIN)
        .set('Cookie', adminCookie)
        .send({});
      expect(lastMethodUnlink.status).toBe(422);
      expect(lastMethodUnlink.body.code).toBe('LAST_AUTH_METHOD_CANNOT_BE_REMOVED');
    } finally {
      await prisma.account.update({
        where: { id: adminAccount.id },
        data: { passwordHash: savedPasswordHash },
      });
      await prisma.authMethod.deleteMany({ where: { id: relinkedId } });
    }
  });

  // ── HOF-022: Birthdays, Anniversaries & Life Landmarks ────────────────────

  it('HOF-022-S01: 3-day celebration reminder crosses a year boundary (Dec 30 -> Jan 2) idempotently without inventing a birth year', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/people')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        first_name: 'JanTwo',
        last_name: 'Celebrant',
        email: 'jantwo.celebrant@example.com',
        phone: '+2348039990102',
        membership_status: 'MEMBER',
        birth_month: 1,
        birth_day: 2,
      });
    expect(createRes.status).toBe(201);
    const janTwoPersonId = createRes.body.id as string;

    // Run the daily scheduler TWICE on branch-local date December 30, 2026
    const run1 = await request(app.getHttpServer())
      .post('/api/celebrations/evaluate')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ local_date: '2026-12-30', timezone: 'Africa/Lagos', window_days: 3 });
    expect(run1.status).toBe(200);

    const run2 = await request(app.getHttpServer())
      .post('/api/celebrations/evaluate')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ local_date: '2026-12-30', timezone: 'Africa/Lagos', window_days: 3 });
    expect(run2.status).toBe(200);

    const matchingReminders = (run2.body.reminders as Array<Record<string, unknown>>).filter(
      (r) => r.person_id === janTwoPersonId && r.kind === 'BIRTHDAY',
    );
    expect(matchingReminders).toHaveLength(1);
    expect(matchingReminders[0].celebration_year).toBe(2027);
    expect(matchingReminders[0].observed_date).toBe('2027-01-02');
    expect(matchingReminders[0].days_until).toBe(3);
    expect(matchingReminders[0].birth_year).toBeNull();
    expect(matchingReminders[0].evaluation_count).toBe(2);
  });

  it('HOF-022-S02: leap-day (Feb 29) and timezone policy is explicit in non-leap years (FEB_28 vs MAR_01)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/people')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        first_name: 'LeapDay',
        last_name: 'Celebrant',
        email: 'leapday.celebrant@example.com',
        membership_status: 'MEMBER',
        birth_month: 2,
        birth_day: 29,
        anniversary_month: 2,
        anniversary_day: 29,
      });
    expect(createRes.status).toBe(201);
    const leapPersonId = createRes.body.id as string;

    // 2027 is a non-leap year. Evaluate on 2027-02-25 with FEB_28 policy -> observed 2027-02-28 (days_until = 3)
    const feb28Run = await request(app.getHttpServer())
      .post('/api/celebrations/evaluate')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        local_date: '2027-02-25',
        timezone: 'Africa/Lagos',
        leap_day_policy: 'FEB_28',
        window_days: 3,
      });
    expect(feb28Run.status).toBe(200);

    const bdayFeb28 = (feb28Run.body.reminders as Array<Record<string, unknown>>).find(
      (r) => r.person_id === leapPersonId && r.kind === 'BIRTHDAY',
    );
    expect(bdayFeb28).toBeDefined();
    expect(bdayFeb28?.observed_month).toBe(2);
    expect(bdayFeb28?.observed_day).toBe(28);
    expect(bdayFeb28?.observed_date).toBe('2027-02-28');
    expect(bdayFeb28?.days_until).toBe(3);

    // Evaluate on 2027-02-26 with MAR_01 policy -> observed 2027-03-01 (days_until = 3)
    const mar01Run = await request(app.getHttpServer())
      .post('/api/celebrations/evaluate')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        local_date: '2027-02-26',
        timezone: 'Africa/Lagos',
        leap_day_policy: 'MAR_01',
        window_days: 3,
      });
    expect(mar01Run.status).toBe(200);

    const bdayMar01 = (mar01Run.body.reminders as Array<Record<string, unknown>>).find(
      (r) => r.person_id === leapPersonId && r.kind === 'BIRTHDAY',
    );
    expect(bdayMar01).toBeDefined();
    expect(bdayMar01?.observed_month).toBe(3);
    expect(bdayMar01?.observed_day).toBe(1);
    expect(bdayMar01?.observed_date).toBe('2027-03-01');
    expect(bdayMar01?.days_until).toBe(3);
  });

  it('HOF-022-S03: life landmark publication in the public bulletin is separate from profile recording and requires preference + approval', async () => {
    const leapPerson = await prisma.person.findFirstOrThrow({
      where: { firstName: 'LeapDay', lastName: 'Celebrant' },
    });

    // 1. Record a graduation landmark with ALLOW_BULLETIN preference -> starts as PENDING
    const createRes = await request(app.getHttpServer())
      .post('/api/celebrations/landmarks')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        person_id: leapPerson.id,
        category: 'GRADUATION',
        title: 'B.Sc. Computer Science (First Class Honours)',
        description: 'Graduated from University of Lagos.',
        occurred_on: '2026-10-20',
        publication_preference: 'ALLOW_BULLETIN',
      });
    expect(createRes.status).toBe(201);
    const landmarkId = createRes.body.id as string;
    expect(createRes.body.approval_status).toBe('PENDING');
    expect(createRes.body.in_public_bulletin).toBe(false);

    // 2. Visible to authorized internal viewers immediately
    const internalList = await request(app.getHttpServer())
      .get(`/api/celebrations/landmarks?person_id=${leapPerson.id}`)
      .set('Cookie', adminCookie);
    expect(internalList.status).toBe(200);
    expect(internalList.body.some((l: { id: string }) => l.id === landmarkId)).toBe(true);

    // 3. Not in public bulletin before approval
    const bulletinBefore = await request(app.getHttpServer()).get('/api/celebrations/landmarks/bulletin');
    expect(bulletinBefore.status).toBe(200);
    expect(bulletinBefore.body.some((l: { id: string }) => l.id === landmarkId)).toBe(false);

    // 4. Attempting to approve when preference is switched to PRIVATE is rejected
    const rejectPrivateApprove = await request(app.getHttpServer())
      .patch(`/api/celebrations/landmarks/${landmarkId}`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        publication_preference: 'PRIVATE',
        approval_status: 'APPROVED',
      });
    expect(rejectPrivateApprove.status).toBe(400);
    expect(rejectPrivateApprove.body.code).toBe('PUBLICATION_PREFERENCE_REQUIRED');

    // 5. Approve with ALLOW_BULLETIN -> now appears in public bulletin
    const approveRes = await request(app.getHttpServer())
      .patch(`/api/celebrations/landmarks/${landmarkId}`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        publication_preference: 'ALLOW_BULLETIN',
        approval_status: 'APPROVED',
        review_note: 'Approved for Sunday bulletin announcement.',
      });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.in_public_bulletin).toBe(true);

    const bulletinAfter = await request(app.getHttpServer()).get('/api/celebrations/landmarks/bulletin');
    expect(bulletinAfter.status).toBe(200);
    expect(bulletinAfter.body.some((l: { id: string }) => l.id === landmarkId)).toBe(true);
  });

  it('HOF-022-S04: celebration contact (greeting email or call log) is linked to the celebration and repeated clicks do not create duplicate deliveries', async () => {
    const leapPerson = await prisma.person.findFirstOrThrow({
      where: { firstName: 'LeapDay', lastName: 'Celebrant' },
    });

    const emailsBefore = sentEmails.filter((m) => m.to === 'leapday.celebrant@example.com').length;

    // First click: send anniversary greeting email
    const firstClick = await request(app.getHttpServer())
      .post('/api/celebrations/contacts')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        person_id: leapPerson.id,
        kind: 'ANNIVERSARY',
        celebration_year: 2027,
        channel: 'EMAIL_GREETING',
        note: 'Wishing your family God’s richest blessings on your anniversary!',
        idempotency_key: `anniv-greeting-${leapPerson.id}-2027`,
      });
    expect(firstClick.status).toBe(200);
    expect(firstClick.body.duplicate).toBe(false);
    expect(firstClick.body.delivery_status).toBe('SENT');

    // Second click with same idempotency_key -> no duplicate record or email sent
    const secondClick = await request(app.getHttpServer())
      .post('/api/celebrations/contacts')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        person_id: leapPerson.id,
        kind: 'ANNIVERSARY',
        celebration_year: 2027,
        channel: 'EMAIL_GREETING',
        note: 'Wishing your family God’s richest blessings on your anniversary!',
        idempotency_key: `anniv-greeting-${leapPerson.id}-2027`,
      });
    expect(secondClick.status).toBe(200);
    expect(secondClick.body.duplicate).toBe(true);
    expect(secondClick.body.id).toBe(firstClick.body.id);

    const emailsAfter = sentEmails.filter((m) => m.to === 'leapday.celebrant@example.com').length;
    expect(emailsAfter - emailsBefore).toBe(1);
  });

  it('HOF-012-S04: CSV error report is formula-safe and import jobs are scoped to the uploader/church leadership', async () => {
    const csv = 'first_name,last_name,phone,email\n=HYPERLINK("x"),Evil,0803,bad-email\nGood,Person,+2348031112233,good.csv.person@example.com';
    const preview = await request(app.getHttpServer())
      .post('/api/people/import-jobs')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ file_name: 'report.csv', csv_text: csv });
    expect(preview.status).toBe(201);
    const jobId = preview.body.id as string;

    const report = await request(app.getHttpServer())
      .get(`/api/people/import-jobs/${jobId}/error-report`)
      .set('Cookie', adminCookie);
    expect(report.status).toBe(200);
    expect(report.body.csv).toContain("\"'=HYPERLINK");
    expect(report.body.csv).not.toContain('Good');

    const list = await request(app.getHttpServer()).get('/api/people/import-jobs').set('Cookie', adminCookie);
    expect(list.status).toBe(200);
    expect(list.body.some((j: { id: string }) => j.id === jobId)).toBe(true);

    await prisma.importJob.delete({ where: { id: jobId } });
  });
});
