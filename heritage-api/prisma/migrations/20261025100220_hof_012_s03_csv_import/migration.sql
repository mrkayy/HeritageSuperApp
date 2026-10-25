-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PREVIEW', 'COMMITTED');

-- CreateEnum
CREATE TYPE "ImportRowState" AS ENUM ('READY', 'INVALID', 'REVIEW_REQUIRED', 'APPLIED', 'SKIPPED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ASSISTANT_TEAM_LEAD';

-- AlterTable
ALTER TABLE "PrayerNote" ADD COLUMN     "sentToPastorAt" TIMESTAMP(3),
ADD COLUMN     "sentToPastorById" UUID,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" UUID NOT NULL,
    "fileName" TEXT,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PREVIEW',
    "createdById" UUID NOT NULL,
    "committedById" UUID,
    "committedAt" TIMESTAMP(3),
    "commitIdempotencyKey" TEXT,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJobRow" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "normalizedPhone" TEXT,
    "email" TEXT,
    "normalizedEmail" TEXT,
    "address" TEXT,
    "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'MEMBER',
    "birthMonth" INTEGER,
    "birthDay" INTEGER,
    "anniversaryMonth" INTEGER,
    "anniversaryDay" INTEGER,
    "state" "ImportRowState" NOT NULL DEFAULT 'READY',
    "errors" JSONB,
    "warnings" JSONB,
    "matchedPersonId" UUID,
    "appliedPersonId" UUID,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJobRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_createdById_createdAt_idx" ON "ImportJob"("createdById", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ImportJobRow_jobId_state_idx" ON "ImportJobRow"("jobId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ImportJobRow_jobId_rowIndex_key" ON "ImportJobRow"("jobId", "rowIndex");

-- AddForeignKey
ALTER TABLE "ImportJobRow" ADD CONSTRAINT "ImportJobRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
