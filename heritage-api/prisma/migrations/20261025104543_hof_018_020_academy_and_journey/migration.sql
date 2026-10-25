-- CreateEnum
CREATE TYPE "AcademyModuleCode" AS ENUM ('FOUNDATION_101', 'MEMBERSHIP_201');

-- CreateEnum
CREATE TYPE "AcademyCohortStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AcademyEnrollmentStatus" AS ENUM ('ENROLLED', 'WITHDRAWN', 'GRADUATED', 'RETAKE_REQUIRED');

-- CreateTable
CREATE TABLE "AcademyCohort" (
    "id" UUID NOT NULL,
    "moduleCode" "AcademyModuleCode" NOT NULL DEFAULT 'FOUNDATION_101',
    "title" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL DEFAULT 'v1:6_sessions_50_pass',
    "startsOn" TEXT NOT NULL,
    "status" "AcademyCohortStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyCohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademySession" (
    "id" UUID NOT NULL,
    "cohortId" UUID NOT NULL,
    "sessionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledOn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyTeacherAssignment" (
    "id" UUID NOT NULL,
    "cohortId" UUID NOT NULL,
    "teacherPersonId" UUID NOT NULL,
    "assignedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademyTeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademyEnrollment" (
    "id" UUID NOT NULL,
    "cohortId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "moduleCode" "AcademyModuleCode" NOT NULL DEFAULT 'FOUNDATION_101',
    "ruleVersion" TEXT NOT NULL DEFAULT 'v1:6_sessions_50_pass',
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "AcademyEnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "creditedSessions" JSONB NOT NULL DEFAULT '[]',
    "creditedSessionCount" INTEGER NOT NULL DEFAULT 0,
    "scorePart1" DOUBLE PRECISION,
    "scorePart2" DOUBLE PRECISION,
    "scorePart3" DOUBLE PRECISION,
    "scorePart4" DOUBLE PRECISION,
    "scorePart5" DOUBLE PRECISION,
    "scorePart6" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "gradedById" UUID,
    "gradedAt" TIMESTAMP(3),
    "makeupApproved" BOOLEAN NOT NULL DEFAULT false,
    "makeupReason" TEXT,
    "makeupApprovedById" UUID,
    "makeupApprovedAt" TIMESTAMP(3),
    "isPrerequisiteOverride" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "graduatedAt" TIMESTAMP(3),
    "graduatedById" UUID,
    "withdrawnAt" TIMESTAMP(3),
    "withdrawalReason" TEXT,
    "enrolledById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyTransition" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "fromStatus" "MembershipStatus",
    "toStatus" "MembershipStatus" NOT NULL,
    "fromFoundationStatus" "FoundationClassStatus",
    "toFoundationStatus" "FoundationClassStatus" NOT NULL,
    "ruleVersion" TEXT NOT NULL DEFAULT 'v1:6_sessions_50_pass',
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "actorPersonId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademyCohort_moduleCode_createdAt_idx" ON "AcademyCohort"("moduleCode", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AcademySession_cohortId_sessionNumber_key" ON "AcademySession"("cohortId", "sessionNumber");

-- CreateIndex
CREATE INDEX "AcademyTeacherAssignment_teacherPersonId_idx" ON "AcademyTeacherAssignment"("teacherPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyTeacherAssignment_cohortId_teacherPersonId_key" ON "AcademyTeacherAssignment"("cohortId", "teacherPersonId");

-- CreateIndex
CREATE INDEX "AcademyEnrollment_cohortId_status_idx" ON "AcademyEnrollment"("cohortId", "status");

-- CreateIndex
CREATE INDEX "AcademyEnrollment_personId_moduleCode_idx" ON "AcademyEnrollment"("personId", "moduleCode");

-- CreateIndex
CREATE INDEX "JourneyTransition_personId_createdAt_idx" ON "JourneyTransition"("personId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AcademySession" ADD CONSTRAINT "AcademySession_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "AcademyCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyTeacherAssignment" ADD CONSTRAINT "AcademyTeacherAssignment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "AcademyCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEnrollment" ADD CONSTRAINT "AcademyEnrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "AcademyCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyEnrollment" ADD CONSTRAINT "AcademyEnrollment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JourneyTransition" ADD CONSTRAINT "JourneyTransition_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
