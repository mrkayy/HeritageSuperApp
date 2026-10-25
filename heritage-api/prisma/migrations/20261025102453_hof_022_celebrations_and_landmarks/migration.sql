-- CreateEnum
CREATE TYPE "CelebrationKind" AS ENUM ('BIRTHDAY', 'ANNIVERSARY');

-- CreateEnum
CREATE TYPE "LeapDayPolicy" AS ENUM ('FEB_28', 'MAR_01');

-- CreateEnum
CREATE TYPE "CelebrationContactChannel" AS ENUM ('CALL', 'EMAIL_GREETING', 'WHATSAPP_SMS', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "LandmarkCategory" AS ENUM ('GRADUATION', 'WEDDING', 'BABY_DEDICATION', 'CAREER_MILESTONE', 'OTHER');

-- CreateEnum
CREATE TYPE "LandmarkPublicationPreference" AS ENUM ('PRIVATE', 'ALLOW_BULLETIN');

-- CreateEnum
CREATE TYPE "LandmarkApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "CelebrationReminder" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "kind" "CelebrationKind" NOT NULL,
    "celebrationYear" INTEGER NOT NULL,
    "sourceMonth" INTEGER NOT NULL,
    "sourceDay" INTEGER NOT NULL,
    "observedMonth" INTEGER NOT NULL,
    "observedDay" INTEGER NOT NULL,
    "observedDate" TEXT NOT NULL,
    "daysUntil" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "leapDayPolicy" "LeapDayPolicy" NOT NULL DEFAULT 'FEB_28',
    "lastEvaluatedOn" TEXT NOT NULL,
    "evaluationCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CelebrationContact" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "kind" "CelebrationKind" NOT NULL,
    "celebrationYear" INTEGER NOT NULL,
    "channel" "CelebrationContactChannel" NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'SENT',
    "note" TEXT,
    "actorPersonId" UUID NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "deliveryStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CelebrationContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifeLandmark" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "category" "LandmarkCategory" NOT NULL DEFAULT 'GRADUATION',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredOn" TEXT,
    "publicationPreference" "LandmarkPublicationPreference" NOT NULL DEFAULT 'PRIVATE',
    "approvalStatus" "LandmarkApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "recordedById" UUID NOT NULL,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeLandmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CelebrationReminder_observedDate_idx" ON "CelebrationReminder"("observedDate");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationReminder_personId_kind_celebrationYear_key" ON "CelebrationReminder"("personId", "kind", "celebrationYear");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationContact_idempotencyKey_key" ON "CelebrationContact"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CelebrationContact_personId_kind_celebrationYear_idx" ON "CelebrationContact"("personId", "kind", "celebrationYear");

-- CreateIndex
CREATE INDEX "LifeLandmark_personId_createdAt_idx" ON "LifeLandmark"("personId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "LifeLandmark_publicationPreference_approvalStatus_idx" ON "LifeLandmark"("publicationPreference", "approvalStatus");

-- AddForeignKey
ALTER TABLE "CelebrationReminder" ADD CONSTRAINT "CelebrationReminder_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationContact" ADD CONSTRAINT "CelebrationContact_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifeLandmark" ADD CONSTRAINT "LifeLandmark_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
