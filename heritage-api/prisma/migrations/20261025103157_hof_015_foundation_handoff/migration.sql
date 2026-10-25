-- CreateEnum
CREATE TYPE "FollowUpTaskKind" AS ENUM ('WELCOME', 'FOUNDATION_HANDOFF');

-- DropIndex
DROP INDEX "FollowUpTask_personId_idx";

-- AlterTable
ALTER TABLE "FollowUpTask" ADD COLUMN     "kind" "FollowUpTaskKind" NOT NULL DEFAULT 'WELCOME',
ADD COLUMN     "recommendationNote" TEXT;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "foundationEligibleAt" TIMESTAMP(3),
ADD COLUMN     "foundationRuleVersion" TEXT;

-- CreateTable
CREATE TABLE "FoundationRecommendation" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "ruleVersion" TEXT NOT NULL DEFAULT 'v1:2_visits',
    "qualifyingVisitsCount" INTEGER NOT NULL,
    "isExemption" BOOLEAN NOT NULL DEFAULT false,
    "exemptionReason" TEXT,
    "note" TEXT NOT NULL,
    "recommendedById" UUID NOT NULL,
    "followUpTaskId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoundationRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoundationRecommendation_personId_key" ON "FoundationRecommendation"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "FoundationRecommendation_followUpTaskId_key" ON "FoundationRecommendation"("followUpTaskId");

-- CreateIndex
CREATE INDEX "FollowUpTask_personId_kind_idx" ON "FollowUpTask"("personId", "kind");

-- AddForeignKey
ALTER TABLE "FoundationRecommendation" ADD CONSTRAINT "FoundationRecommendation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoundationRecommendation" ADD CONSTRAINT "FoundationRecommendation_followUpTaskId_fkey" FOREIGN KEY ("followUpTaskId") REFERENCES "FollowUpTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
