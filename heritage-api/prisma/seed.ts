/**
 * Idempotent bootstrap: core teams, today's service occurrence, and the superadmin account.
 * If an account or admin already exists, overrides/updates its credentials to match
 * the configured SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.
 * Run with `npm run db:seed`.
 */
import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const TEAMS = [
  { key: 'information_center', name: 'Information Center' },
  { key: 'membership', name: 'Membership' },
];

const DEFAULT_ADMIN_EMAIL = 'securesuperadmin@heritagemmc.site';
const DEFAULT_ADMIN_PASSWORD = '$SecureSuperHMMCAdmin2026';

async function main() {
  for (const t of TEAMS) {
    await prisma.team.upsert({ where: { key: t.key }, update: { name: t.name }, create: t });
  }
  // Follow-Up is a function of the Membership team, not a standalone team.
  await prisma.team.deleteMany({ where: { key: 'follow_up' } });

  // Ensure a default Sunday service occurrence exists for today (UTC date) so intake works out of the box
  const today = new Date();
  const serviceDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  await prisma.serviceOccurrence.upsert({
    where: { serviceDate_kind: { serviceDate, kind: 'SUNDAY_FIRST' } },
    update: {},
    create: {
      title: 'Sunday 1st Service',
      kind: 'SUNDAY_FIRST',
      serviceDate,
      headcount: 0,
    },
  });

  const email = (process.env.SEED_ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL).toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  const firstName = process.env.SEED_ADMIN_FIRST_NAME ?? 'Super';
  const lastName = process.env.SEED_ADMIN_LAST_NAME ?? 'Admin';

  if (password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD (min 12 chars) is required');
  }

  const passwordHash = await argon2.hash(password);

  // Find either an account matching the target email OR any existing ADMIN assignment
  const existingByEmail = await prisma.account.findUnique({
    where: { loginEmail: email },
    include: { person: true },
  });

  const existingAdminAssignment = !existingByEmail
    ? await prisma.assignment.findFirst({
        where: { role: 'ADMIN', endedAt: null },
        include: { person: { include: { account: true } } },
      })
    : null;

  const targetAccount = existingByEmail ?? existingAdminAssignment?.person.account ?? null;

  if (targetAccount) {
    await prisma.$transaction(async (tx) => {
      await tx.person.update({
        where: { id: targetAccount.personId },
        data: {
          firstName,
          lastName,
          email,
          membershipStatus: 'WORKER',
          foundationClassStatus: 'COMPLETED',
        },
      });
      await tx.account.update({
        where: { id: targetAccount.id },
        data: {
          loginEmail: email,
          passwordHash,
          status: 'ACTIVE',
        },
      });
      // Ensure an active ADMIN assignment exists on this person
      const activeAdmin = await tx.assignment.findFirst({
        where: { personId: targetAccount.personId, role: 'ADMIN', endedAt: null },
      });
      if (!activeAdmin) {
        await tx.assignment.create({
          data: { personId: targetAccount.personId, role: 'ADMIN' },
        });
      }
      // Revoke any stale sessions so the overridden credentials take effect cleanly
      await tx.session.updateMany({
        where: { accountId: targetAccount.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    console.log(`Updated existing admin credentials to ${email}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const person = await tx.person.create({
      data: {
        firstName,
        lastName,
        email,
        membershipStatus: 'WORKER',
        foundationClassStatus: 'COMPLETED',
      },
    });
    await tx.account.create({
      data: { personId: person.id, loginEmail: email, passwordHash, status: 'ACTIVE' },
    });
    await tx.assignment.create({ data: { personId: person.id, role: 'ADMIN' } });
  });
  console.log(`Created admin ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
