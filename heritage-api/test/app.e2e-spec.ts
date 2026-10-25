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
    await prisma.profileChangeProposal.deleteMany({});
    await prisma.importJob.deleteMany({});
    await prisma.account.deleteMany({
      where: {
        loginEmail: {
          in: ['steward.test@example.com', 'visitor.ade@example.com', 'csv.chioma@example.com', 'dayo.amadi@example.com', 'kemi.adebayo@example.com'],
        },
      },
    });
    await prisma.person.deleteMany({
      where: {
        OR: [
          {
            email: {
              in: ['steward.test@example.com', 'visitor.ade@example.com', 'csv.chioma@example.com', 'dayo.amadi@example.com', 'kemi.adebayo@example.com'],
            },
          },
          { firstName: 'Mama', lastName: 'Bolanle' },
          { firstName: 'Chioma', lastName: 'Nwosu' },
          { firstName: 'JanTwo', lastName: 'Celebrant' },
          { firstName: 'LeapDay', lastName: 'Celebrant' },
          { firstName: 'Tosin', lastName: 'Fashola' },
          { firstName: 'Kemi', lastName: 'Adebayo' },
          { firstName: 'Dayo', lastName: 'Amadi' },
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

  // ── HOF-015: Foundation Eligibility, Recommendation & IC-to-Membership Handoff ──

  it('HOF-015-S01, S02 & S03: 2 qualifying visits produce Foundation eligibility only, corrected attendance refuses stale recommendation, and recommendation delivers one Membership task idempotently', async () => {
    // Ensure we have two distinct service occurrences
    const occ1Res = await request(app.getHttpServer())
      .post('/api/attendance/occurrences')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        title: 'Sunday 1st Service (HOF-015 Week 1)',
        kind: 'SUNDAY_FIRST',
        service_date: '2026-10-04',
        headcount: 100,
      });
    const occ1Id =
      occ1Res.status === 201
        ? (occ1Res.body.id as string)
        : (
            await prisma.serviceOccurrence.findFirstOrThrow({
              where: { serviceDate: new Date('2026-10-04T00:00:00.000Z'), kind: 'SUNDAY_FIRST' },
            })
          ).id;

    const occ2Res = await request(app.getHttpServer())
      .post('/api/attendance/occurrences')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        title: 'Sunday 1st Service (HOF-015 Week 2)',
        kind: 'SUNDAY_FIRST',
        service_date: '2026-10-11',
        headcount: 110,
      });
    const occ2Id =
      occ2Res.status === 201
        ? (occ2Res.body.id as string)
        : (
            await prisma.serviceOccurrence.findFirstOrThrow({
              where: { serviceDate: new Date('2026-10-11T00:00:00.000Z'), kind: 'SUNDAY_FIRST' },
            })
          ).id;

    // 1. Capture visitor on Visit #1 -> 1 qualifying visit, NOT yet eligible
    const visit1 = await request(app.getHttpServer())
      .post('/api/people/visitor-intakes')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        first_name: 'Tosin',
        last_name: 'Fashola',
        phone: '+2348035550150',
        service_occurrence_id: occ1Id,
      });
    expect(visit1.status).toBe(201);
    const tosinId = visit1.body.person_id as string;
    expect(visit1.body.qualifying_visits_count).toBe(1);
    expect(visit1.body.foundation_eligible).toBe(false);

    // 2. HOF-015-S01: Commit second qualifying visit -> Foundation eligibility is recorded against rule v1:2_visits,
    //    and NO Foundation enrollment, Account, or completed achievement is created
    const visit2 = await request(app.getHttpServer())
      .post(`/api/attendance/occurrences/${occ2Id}/check-ins`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ person_id: tosinId });
    expect(visit2.status).toBe(200);
    expect(visit2.body.qualifying_visits_count).toBe(2);
    expect(visit2.body.foundation_eligible).toBe(true);
    expect(visit2.body.foundation_rule_version).toBe('v1:2_visits');

    const tosinAfterVisit2 = await prisma.person.findUniqueOrThrow({
      where: { id: tosinId },
      include: { account: true },
    });
    expect(tosinAfterVisit2.foundationEligibleAt).not.toBeNull();
    expect(tosinAfterVisit2.foundationRuleVersion).toBe('v1:2_visits');
    expect(tosinAfterVisit2.foundationClassStatus).toBe('NOT_STARTED');
    expect(tosinAfterVisit2.membershipStatus).toBe('FIRST_TIMER');
    expect(tosinAfterVisit2.account).toBeNull();

    // 3. HOF-015-S03: Attendance on Visit #2 is corrected/removed before recommendation ->
    //    attempting a recommendation against stale eligibility re-evaluates evidence and refuses with 422
    const removeVisit2 = await request(app.getHttpServer())
      .delete(`/api/attendance/occurrences/${occ2Id}/check-ins/${tosinId}?reason=mistaken_checkin`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie);
    expect(removeVisit2.status).toBe(200);
    expect(removeVisit2.body.qualifying_visits_count).toBe(1);
    expect(removeVisit2.body.foundation_eligible).toBe(false);

    const staleRecommendAttempt = await request(app.getHttpServer())
      .post(`/api/people/${tosinId}/foundation-recommendations`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        note: 'Recommending Tosin for Foundation Class cohort.',
      });
    expect(staleRecommendAttempt.status).toBe(422);
    expect(staleRecommendAttempt.body.code).toBe('INSUFFICIENT_QUALIFYING_VISITS');

    // 4. Restore second qualifying visit and submit recommendation TWICE (replay) ->
    //    HOF-015-S02: recommendation and durable audit event commit together, exactly ONE
    //    FOUNDATION_HANDOFF task appears in Membership, and IC sees handoff status
    await request(app.getHttpServer())
      .post(`/api/attendance/occurrences/${occ2Id}/check-ins`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ person_id: tosinId });

    const rec1 = await request(app.getHttpServer())
      .post(`/api/people/${tosinId}/foundation-recommendations`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        note: 'Attended two Sundays and eager to start Foundation Class.',
      });
    expect(rec1.status).toBe(200);
    expect(rec1.body.handoff_status).toBe('HANDED_OFF_TO_MEMBERSHIP');
    expect(rec1.body.replayed).toBe(false);

    const rec2Replay = await request(app.getHttpServer())
      .post(`/api/people/${tosinId}/foundation-recommendations`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        note: 'Attended two Sundays and eager to start Foundation Class.',
      });
    expect(rec2Replay.status).toBe(200);
    expect(rec2Replay.body.replayed).toBe(true);
    expect(rec2Replay.body.recommendation_id).toBe(rec1.body.recommendation_id);
    expect(rec2Replay.body.followup_task_id).toBe(rec1.body.followup_task_id);

    const handoffTasks = await prisma.followUpTask.findMany({
      where: { personId: tosinId, kind: 'FOUNDATION_HANDOFF' },
    });
    expect(handoffTasks).toHaveLength(1);
    expect(handoffTasks[0].recommendationNote).toBe(
      'Attended two Sundays and eager to start Foundation Class.',
    );

    // IC eligibility projection shows HANDED_OFF_TO_MEMBERSHIP
    const icEligibilityRes = await request(app.getHttpServer())
      .get('/api/people/foundation-eligibility')
      .set('Cookie', adminCookie);
    expect(icEligibilityRes.status).toBe(200);
    const tosinProjection = (icEligibilityRes.body as Array<Record<string, unknown>>).find(
      (item) => item.person_id === tosinId,
    );
    expect(tosinProjection).toBeDefined();
    expect(tosinProjection?.handoff_status).toBe('HANDED_OFF_TO_MEMBERSHIP');
  });

  // ── HOF-018, HOF-019 & HOF-020: Academy Cohorts, 6-Part Rubric, Attendance-Gated Graduation & Journey ──

  it('HOF-018, HOF-019 & HOF-020: schedules a 6-session cohort, enforces prerequisites, computes 6-part rubric (85.3/100), enforces attendance gates (2/3 retake, 4/5 makeup, 6 eligible), graduates idempotently, and records journey history', async () => {
    const tosin = await prisma.person.findFirstOrThrow({
      where: { firstName: 'Tosin', lastName: 'Fashola' },
    });

    // 1. HOF-019-S01: Coordinator schedules a Foundation 101 cohort with 6 sessions and a Membership 201 cohort
    const foundCohortRes = await request(app.getHttpServer())
      .post('/api/academy/cohorts')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        module_code: 'FOUNDATION_101',
        title: 'October 2026 Foundation Cohort',
        starts_on: '2026-10-18',
        teacher_person_ids: [stewardPersonId],
      });
    expect(foundCohortRes.status).toBe(201);
    expect(foundCohortRes.body.sessions_count).toBe(6);
    expect(foundCohortRes.body.teachers_count).toBe(1);
    const foundationCohortId = foundCohortRes.body.id as string;

    const memCohortRes = await request(app.getHttpServer())
      .post('/api/academy/cohorts')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        module_code: 'MEMBERSHIP_201',
        title: 'November 2026 Membership Maturity Cohort',
        starts_on: '2026-11-01',
      });
    expect(memCohortRes.status).toBe(201);
    const membershipCohortId = memCohortRes.body.id as string;

    // 2. HOF-019-S02: Attempting to enroll Tosin in MEMBERSHIP_201 before completing FOUNDATION_101 fails with 422 MISSING_PREREQUISITE
    const prematureMemEnroll = await request(app.getHttpServer())
      .post(`/api/academy/cohorts/${membershipCohortId}/enrollments`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ person_id: tosin.id });
    expect(prematureMemEnroll.status).toBe(422);
    expect(prematureMemEnroll.body.code).toBe('MISSING_PREREQUISITE');

    // 3. Enroll Tosin (who has Foundation eligibility + IC handoff) in FOUNDATION_101
    const enrollRes = await request(app.getHttpServer())
      .post(`/api/academy/cohorts/${foundationCohortId}/enrollments`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ person_id: tosin.id });
    expect(enrollRes.status).toBe(201);
    const enrollmentId = enrollRes.body.id as string;
    expect(enrollRes.body.person.foundation_class_status).toBe('IN_PROGRESS');

    // Reactivate steward and sign in freshly (since HOF-001-S04 suspended and revoked their earlier session)
    await request(app.getHttpServer())
      .post(`/api/stewards/${stewardPersonId}/reactivate`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie);

    const stewardLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', ORIGIN)
      .send({ email: 'steward.test@example.com', password: 'StewardPassword1' });
    stewardCookie = stewardLogin.headers['set-cookie'] as unknown as string[];

    // 4. HOF-020-S01: Assigned teacher grades the 6-part rubric:
    //    Out-of-range component value (>20 on part 1) is rejected with 422
    const invalidGrade = await request(app.getHttpServer())
      .patch(`/api/academy/enrollments/${enrollmentId}/grades`)
      .set('Origin', ORIGIN)
      .set('Cookie', stewardCookie)
      .send({ scores: [25, 16, 17, 18, 8, 8.3] });
    expect(invalidGrade.status).toBe(422);
    expect(invalidGrade.body.code).toBe('RUBRIC_SCORE_OUT_OF_RANGE');

    //    Valid scores [18, 16, 17, 18, 8, 8.3] -> server computes 85.3 out of 100
    const validGrade = await request(app.getHttpServer())
      .patch(`/api/academy/enrollments/${enrollmentId}/grades`)
      .set('Origin', ORIGIN)
      .set('Cookie', stewardCookie)
      .send({ scores: [18, 16, 17, 18, 8, 8.3] });
    expect(validGrade.status).toBe(200);
    expect(validGrade.body.total_score).toBe(85.3);

    // 5. HOF-020-S02: Attendance gates graduation:
    //    - 2 or 3 sessions -> retake_required
    const s2 = await request(app.getHttpServer())
      .patch(`/api/academy/enrollments/${enrollmentId}/sessions`)
      .set('Origin', ORIGIN)
      .set('Cookie', stewardCookie)
      .send({ credited_sessions: [1, 2] });
    expect(s2.body.graduation_eligibility).toBe('retake_required');

    const s3 = await request(app.getHttpServer())
      .patch(`/api/academy/enrollments/${enrollmentId}/sessions`)
      .set('Origin', ORIGIN)
      .set('Cookie', stewardCookie)
      .send({ credited_sessions: [1, 2, 3] });
    expect(s3.body.graduation_eligibility).toBe('retake_required');

    //    - 4 or 5 sessions -> coordinator_makeup_decision_required
    const s4 = await request(app.getHttpServer())
      .patch(`/api/academy/enrollments/${enrollmentId}/sessions`)
      .set('Origin', ORIGIN)
      .set('Cookie', stewardCookie)
      .send({ credited_sessions: [1, 2, 3, 4] });
    expect(s4.body.graduation_eligibility).toBe('coordinator_makeup_decision_required');

    const s5 = await request(app.getHttpServer())
      .patch(`/api/academy/enrollments/${enrollmentId}/sessions`)
      .set('Origin', ORIGIN)
      .set('Cookie', stewardCookie)
      .send({ credited_sessions: [1, 2, 3, 4, 5] });
    expect(s5.body.graduation_eligibility).toBe('coordinator_makeup_decision_required');

    //    Attempting to graduate at 5 sessions before makeup approval is refused with 422
    const prematureGrad = await request(app.getHttpServer())
      .post(`/api/academy/enrollments/${enrollmentId}/graduate`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie);
    expect(prematureGrad.status).toBe(422);
    expect(prematureGrad.body.code).toBe('GRADUATION_REQUIREMENTS_UNMET');

    //    Coordinator approves makeup for Session 6 -> eligibility becomes 'eligible'
    const makeupRes = await request(app.getHttpServer())
      .post(`/api/academy/enrollments/${enrollmentId}/makeup`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        approved: true,
        reason: 'Completed makeup session 6 with teacher review.',
      });
    expect(makeupRes.status).toBe(200);
    expect(makeupRes.body.graduation_eligibility).toBe('eligible');

    // 6. HOF-020-S03: Graduate once and retry -> one achievement and next-stage eligibility recorded,
    //    and no automatic enrollment in MEMBERSHIP_201 cohort is created
    const grad1 = await request(app.getHttpServer())
      .post(`/api/academy/enrollments/${enrollmentId}/graduate`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie);
    expect(grad1.status).toBe(200);
    expect(grad1.body.status).toBe('GRADUATED');
    expect(grad1.body.replayed).toBe(false);
    expect(['MEMBERSHIP_201', 'SUNDAY_SCHOOL_101']).toContain(grad1.body.next_stage_eligible);
    expect(grad1.body.person.foundation_class_status).toBe('COMPLETED');
    expect(grad1.body.person.membership_status).toBe('MEMBER');

    const grad2Replay = await request(app.getHttpServer())
      .post(`/api/academy/enrollments/${enrollmentId}/graduate`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie);
    expect(grad2Replay.status).toBe(200);
    expect(grad2Replay.body.replayed).toBe(true);

    const memEnrollmentsAfterGrad = await prisma.academyEnrollment.count({
      where: { personId: tosin.id, moduleCode: 'MEMBERSHIP_201' },
    });
    expect(memEnrollmentsAfterGrad).toBe(0);

    // 7. HOF-018-S02: Journey timeline shows the recorded transition, rule version, actor, and evidence
    const journeyRes = await request(app.getHttpServer())
      .get(`/api/academy/journey/${tosin.id}`)
      .set('Cookie', adminCookie);
    expect(journeyRes.status).toBe(200);
    expect(journeyRes.body).toHaveLength(1);
    expect(journeyRes.body[0].to_status).toBe('MEMBER');
    expect(journeyRes.body[0].to_foundation_status).toBe('COMPLETED');
    expect(journeyRes.body[0].rule_version).toBe('v1:6_sessions_50_pass');
    expect(journeyRes.body[0].is_override).toBe(false);
  });

  // ── HOF-017: Profile Enrichment, Maker-Checker & Verification Queue ────────

  it('HOF-017-S04: Anti-self-approval and optimistic version lock protect profile change proposals; checker approves matching base version', async () => {
    // 1. Create a baseline verified Person
    const kemiRes = await request(app.getHttpServer())
      .post('/api/people')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        first_name: 'Kemi',
        last_name: 'Adebayo',
        phone: '+2348030001704',
        email: 'kemi.adebayo@example.com',
        address: '10 Marina Street, Lagos Island',
        membership_status: 'MEMBER',
      });
    expect(kemiRes.status).toBe(201);
    const kemiId = kemiRes.body.id as string;

    // Direct verification of Kemi
    await request(app.getHttpServer())
      .post(`/api/people/${kemiId}/verifications`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ notes: 'Verified utility bill' });

    const kemiBefore = await prisma.person.findUniqueOrThrow({ where: { id: kemiId } });
    const initialVersion = kemiBefore.version;

    // 2. HOF-017-S02: Steward (Maker) drafts a proposal to update address
    const proposalRes = await request(app.getHttpServer())
      .post(`/api/people/${kemiId}/proposals`)
      .set('Origin', ORIGIN)
      .set('Cookie', stewardCookie)
      .send({
        proposed_changes: { address: '20 Victoria Island Blvd, Lagos' },
        reason: 'Member relocated residence',
      });
    expect(proposalRes.status).toBe(201);
    expect(proposalRes.body.status).toBe('PENDING');
    expect(proposalRes.body.base_version).toBe(initialVersion);
    const proposalId = proposalRes.body.id as string;

    // Live address must remain unchanged
    const kemiLive = await prisma.person.findUniqueOrThrow({ where: { id: kemiId } });
    expect(kemiLive.address).toBe('10 Marina Street, Lagos Island');

    // 3. HOF-017-S04: Maker holding review capability attempts to self-approve own proposal -> rejected with 422 CANNOT_APPROVE_OWN_PROPOSAL
    const adminProposalRes = await request(app.getHttpServer())
      .post(`/api/people/${kemiId}/proposals`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        proposed_changes: { phone: '+2348031112222' },
        reason: 'Admin draft update',
      });
    expect(adminProposalRes.status).toBe(201);
    const adminProposalId = adminProposalRes.body.id as string;

    const selfApprove = await request(app.getHttpServer())
      .post(`/api/people/proposals/${adminProposalId}/review`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ action: 'APPROVE' });
    expect(selfApprove.status).toBe(422);
    expect(selfApprove.body.code).toBe('CANNOT_APPROVE_OWN_PROPOSAL');

    // 4. HOF-017-S04: Base profile changes before checker review -> version conflict
    await request(app.getHttpServer())
      .patch(`/api/people/${kemiId}`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ phone: '+2348039999999' });

    const kemiAfterDirectEdit = await prisma.person.findUniqueOrThrow({ where: { id: kemiId } });
    expect(kemiAfterDirectEdit.version).toBeGreaterThan(initialVersion);

    // Checker tries to approve the stale proposal
    const staleApprove = await request(app.getHttpServer())
      .post(`/api/people/proposals/${proposalId}/review`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ action: 'APPROVE' });
    expect(staleApprove.status).toBe(409);
    expect(staleApprove.body.code).toBe('BASE_PROFILE_STALE');

    // 5. Maker submits fresh proposal matching current version
    const freshProposalRes = await request(app.getHttpServer())
      .post(`/api/people/${kemiId}/proposals`)
      .set('Origin', ORIGIN)
      .set('Cookie', stewardCookie)
      .send({
        proposed_changes: { address: '25 Admiralty Way, Lekki Phase 1' },
        reason: 'Corrected new residential address after review',
      });
    expect(freshProposalRes.status).toBe(201);
    const freshProposalId = freshProposalRes.body.id as string;

    // Checker approves fresh proposal -> atomic commit
    const validApprove = await request(app.getHttpServer())
      .post(`/api/people/proposals/${freshProposalId}/review`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ action: 'APPROVE' });
    expect(validApprove.status).toBe(200);
    expect(validApprove.body.status).toBe('APPROVED');
    expect(validApprove.body.person.address).toBe('25 Admiralty Way, Lekki Phase 1');

    const kemiAfterApproval = await prisma.person.findUniqueOrThrow({ where: { id: kemiId } });
    expect(kemiAfterApproval.address).toBe('25 Admiralty Way, Lekki Phase 1');

    // 6. Checker rejection preserves profile and returns feedback
    const rejectProposalRes = await request(app.getHttpServer())
      .post(`/api/people/${kemiId}/proposals`)
      .set('Origin', ORIGIN)
      .set('Cookie', stewardCookie)
      .send({
        proposed_changes: { first_name: 'IncorrectName' },
      });
    const rejectId = rejectProposalRes.body.id as string;

    const rejection = await request(app.getHttpServer())
      .post(`/api/people/proposals/${rejectId}/review`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ action: 'REJECT', rejection_reason: 'Name does not match official government ID.' });
    expect(rejection.status).toBe(200);
    expect(rejection.body.status).toBe('REJECTED');
    expect(rejection.body.rejection_reason).toBe('Name does not match official government ID.');

    const kemiAfterRejection = await prisma.person.findUniqueOrThrow({ where: { id: kemiId } });
    expect(kemiAfterRejection.firstName).toBe('Kemi');
  });

  it('HOF-017-S05: Verification and account eligibility do not imply membership', async () => {
    // 1. Create a visitor person
    const dayoRes = await request(app.getHttpServer())
      .post('/api/people')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        first_name: 'Dayo',
        last_name: 'Amadi',
        email: 'dayo.amadi@example.com',
        phone: '+2348050001705',
        membership_status: 'VISITOR',
      });
    expect(dayoRes.status).toBe(201);
    const dayoId = dayoRes.body.id as string;

    // 2. Issuing a claim invitation before verification is rejected
    const prematureInvite = await request(app.getHttpServer())
      .post(`/api/people/${dayoId}/claim-invitations`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ email: 'dayo.amadi@example.com' });
    expect(prematureInvite.status).toBe(422);
    expect(prematureInvite.body.code).toBe('PERSON_NOT_VERIFIED');

    // 3. Authorized verification commits isVerified = true, but DOES NOT alter membershipStatus
    const verifyRes = await request(app.getHttpServer())
      .post(`/api/people/${dayoId}/verifications`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ notes: 'Verified via national identity card', evidence: { id_type: 'NIN' } });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.is_verified).toBe(true);
    expect(verifyRes.body.membership_status).toBe('VISITOR');

    const dayoAfterVerify = await prisma.person.findUniqueOrThrow({ where: { id: dayoId } });
    expect(dayoAfterVerify.isVerified).toBe(true);
    expect(dayoAfterVerify.membershipStatus).toBe('VISITOR'); // Unchanged!

    // 4. Once verified, account-claim invitation is granted
    const validInvite = await request(app.getHttpServer())
      .post(`/api/people/${dayoId}/claim-invitations`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ email: 'dayo.amadi@example.com' });
    expect(validInvite.status).toBe(201);
    expect(validInvite.body.email).toBe('dayo.amadi@example.com');

    // 5. Standing remains VISITOR (verification & invitation do NOT infer or promote membership standing)
    const dayoAfterInvite = await prisma.person.findUniqueOrThrow({ where: { id: dayoId } });
    expect(dayoAfterInvite.membershipStatus).toBe('VISITOR');
  });

  it('Sunday School Pipeline (SS1, SS2, SS3): enforces sequential prerequisites, marks 6 sessions, grades 6-part rubric, graduates to next module, and computes pipeline stats', async () => {
    // 1. Create a person who has completed Foundation Class
    const ssStudent = await prisma.person.create({
      data: {
        firstName: 'Bukola',
        lastName: 'Adeyemi',
        email: 'bukola.adeyemi@example.com',
        phone: '+2348039998877',
        membershipStatus: 'MEMBER',
        foundationClassStatus: 'COMPLETED',
        sundaySchoolStatus: 'NOT_STARTED',
        isVerified: true,
      },
    });

    // Also create a raw visitor who has NOT completed Foundation Class
    const rawVisitor = await prisma.person.create({
      data: {
        firstName: 'Seyi',
        lastName: 'Makinde',
        email: 'seyi.makinde@example.com',
        membershipStatus: 'VISITOR',
        foundationClassStatus: 'NOT_STARTED',
        sundaySchoolStatus: 'NOT_STARTED',
      },
    });

    // 2. Schedule cohorts for SUNDAY_SCHOOL_101 and SUNDAY_SCHOOL_102
    const ss1CohortRes = await request(app.getHttpServer())
      .post('/api/academy/cohorts')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        module_code: 'SUNDAY_SCHOOL_101',
        title: 'Sunday School Module 1 — Faith & Doctrine 2026',
        starts_on: '2026-11-01',
      });
    expect(ss1CohortRes.status).toBe(201);
    expect(ss1CohortRes.body.sessions_count).toBe(6);
    const ss1CohortId = ss1CohortRes.body.id as string;

    const ss2CohortRes = await request(app.getHttpServer())
      .post('/api/academy/cohorts')
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({
        module_code: 'SUNDAY_SCHOOL_102',
        title: 'Sunday School Module 2 — Stewardship & Ministry 2026',
        starts_on: '2026-12-01',
      });
    expect(ss2CohortRes.status).toBe(201);
    const ss2CohortId = ss2CohortRes.body.id as string;

    // 3. Raw visitor attempting to enroll in SUNDAY_SCHOOL_101 fails with MISSING_PREREQUISITE
    const unqualEnroll = await request(app.getHttpServer())
      .post(`/api/academy/cohorts/${ss1CohortId}/enrollments`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ person_id: rawVisitor.id });
    expect(unqualEnroll.status).toBe(422);
    expect(unqualEnroll.body.code).toBe('MISSING_PREREQUISITE');

    // 4. Bukola attempting to enroll directly in SUNDAY_SCHOOL_102 fails with MISSING_PREREQUISITE
    const prematureSS2Enroll = await request(app.getHttpServer())
      .post(`/api/academy/cohorts/${ss2CohortId}/enrollments`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ person_id: ssStudent.id });
    expect(prematureSS2Enroll.status).toBe(422);
    expect(prematureSS2Enroll.body.code).toBe('MISSING_PREREQUISITE');

    // 5. Enroll Bukola in SUNDAY_SCHOOL_101 -> updates sundaySchoolStatus to MODULE_1_IN_PROGRESS
    const ss1Enroll = await request(app.getHttpServer())
      .post(`/api/academy/cohorts/${ss1CohortId}/enrollments`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ person_id: ssStudent.id });
    expect(ss1Enroll.status).toBe(201);
    const ss1EnrollmentId = ss1Enroll.body.id as string;
    expect(ss1Enroll.body.person.sunday_school_status).toBe('MODULE_1_IN_PROGRESS');

    // 6. Record attendance for 6 sessions and grade 6-part rubric (total 90/100)
    await request(app.getHttpServer())
      .patch(`/api/academy/enrollments/${ss1EnrollmentId}/sessions`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ credited_sessions: [1, 2, 3, 4, 5, 6] });

    await request(app.getHttpServer())
      .patch(`/api/academy/enrollments/${ss1EnrollmentId}/grades`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ scores: [18, 18, 18, 18, 9, 9] });

    // 7. Graduate Bukola from SUNDAY_SCHOOL_101 -> updates sundaySchoolStatus to MODULE_1_COMPLETED
    const gradSS1 = await request(app.getHttpServer())
      .post(`/api/academy/enrollments/${ss1EnrollmentId}/graduate`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie);
    expect(gradSS1.status).toBe(200);
    expect(gradSS1.body.status).toBe('GRADUATED');
    expect(gradSS1.body.next_stage_eligible).toBe('SUNDAY_SCHOOL_102');
    expect(gradSS1.body.person.sunday_school_status).toBe('MODULE_1_COMPLETED');

    // 8. Now Bukola can enroll in SUNDAY_SCHOOL_102 -> sets MODULE_2_IN_PROGRESS
    const ss2Enroll = await request(app.getHttpServer())
      .post(`/api/academy/cohorts/${ss2CohortId}/enrollments`)
      .set('Origin', ORIGIN)
      .set('Cookie', adminCookie)
      .send({ person_id: ssStudent.id });
    expect(ss2Enroll.status).toBe(201);
    expect(ss2Enroll.body.person.sunday_school_status).toBe('MODULE_2_IN_PROGRESS');

    // 9. Inspect pipeline & Sunday School stats
    const pipelineRes = await request(app.getHttpServer())
      .get('/api/academy/pipeline')
      .set('Cookie', adminCookie);
    expect(pipelineRes.status).toBe(200);
    expect(pipelineRes.body.sunday_school_module_2).toBeGreaterThanOrEqual(1);

    const ssStatsRes = await request(app.getHttpServer())
      .get('/api/academy/sunday-school/stats')
      .set('Cookie', adminCookie);
    expect(ssStatsRes.status).toBe(200);
    expect(ssStatsRes.body.active_cohorts).toBeGreaterThanOrEqual(2);
    expect(ssStatsRes.body.graduated_count).toBeGreaterThanOrEqual(1);
  });
});
