-- CreateEnum
CREATE TYPE "FoundationClassStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ServiceKind" AS ENUM ('SUNDAY_FIRST', 'SUNDAY_SECOND', 'SUNDAY_COMBINED', 'MIDWEEK', 'SPECIAL');

-- CreateEnum
CREATE TYPE "FollowUpTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('REACHED', 'UNREACHABLE', 'VOICEMAIL', 'WRONG_NUMBER', 'REQUESTED_PRAYER', 'NEEDS_PASTORAL_VISIT');

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "address" TEXT,
ADD COLUMN     "anniversaryDay" INTEGER,
ADD COLUMN     "anniversaryMonth" INTEGER,
ADD COLUMN     "birthDay" INTEGER,
ADD COLUMN     "birthMonth" INTEGER,
ADD COLUMN     "firstVisitedAt" TIMESTAMP(3),
ADD COLUMN     "foundationClassStatus" "FoundationClassStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "inviterPersonId" UUID,
ADD COLUMN     "missingContactReason" TEXT;

-- CreateTable
CREATE TABLE "PrayerNote" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "serviceOccurrenceId" UUID,
    "content" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrayerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceOccurrence" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "ServiceKind" NOT NULL DEFAULT 'SUNDAY_FIRST',
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "headcount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" UUID NOT NULL,
    "serviceOccurrenceId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'check_in',
    "isFirstVisit" BOOLEAN NOT NULL DEFAULT false,
    "recordedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpTask" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "serviceOccurrenceId" UUID,
    "assigneePersonId" UUID,
    "assignedById" UUID,
    "assignedAt" TIMESTAMP(3),
    "status" "FollowUpTaskStatus" NOT NULL DEFAULT 'OPEN',
    "lastOutcome" "CallOutcome",
    "needsPastoralVisit" BOOLEAN NOT NULL DEFAULT false,
    "dueAt" TIMESTAMP(3),
    "nextActionAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "callerPersonId" UUID NOT NULL,
    "outcome" "CallOutcome" NOT NULL,
    "note" TEXT,
    "needsPastoralVisit" BOOLEAN NOT NULL DEFAULT false,
    "nextActionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrayerNote_personId_createdAt_idx" ON "PrayerNote"("personId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceOccurrence_serviceDate_idx" ON "ServiceOccurrence"("serviceDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceOccurrence_serviceDate_kind_key" ON "ServiceOccurrence"("serviceDate", "kind");

-- CreateIndex
CREATE INDEX "AttendanceRecord_personId_createdAt_idx" ON "AttendanceRecord"("personId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_serviceOccurrenceId_personId_key" ON "AttendanceRecord"("serviceOccurrenceId", "personId");

-- CreateIndex
CREATE INDEX "FollowUpTask_status_assigneePersonId_idx" ON "FollowUpTask"("status", "assigneePersonId");

-- CreateIndex
CREATE INDEX "FollowUpTask_personId_idx" ON "FollowUpTask"("personId");

-- CreateIndex
CREATE INDEX "CallLog_taskId_createdAt_idx" ON "CallLog"("taskId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Person_membershipStatus_idx" ON "Person"("membershipStatus");

-- CreateIndex
CREATE INDEX "Person_birthMonth_birthDay_idx" ON "Person"("birthMonth", "birthDay");

-- CreateIndex
CREATE INDEX "Person_anniversaryMonth_anniversaryDay_idx" ON "Person"("anniversaryMonth", "anniversaryDay");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_inviterPersonId_fkey" FOREIGN KEY ("inviterPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerNote" ADD CONSTRAINT "PrayerNote_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerNote" ADD CONSTRAINT "PrayerNote_serviceOccurrenceId_fkey" FOREIGN KEY ("serviceOccurrenceId") REFERENCES "ServiceOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_serviceOccurrenceId_fkey" FOREIGN KEY ("serviceOccurrenceId") REFERENCES "ServiceOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_serviceOccurrenceId_fkey" FOREIGN KEY ("serviceOccurrenceId") REFERENCES "ServiceOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "FollowUpTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
