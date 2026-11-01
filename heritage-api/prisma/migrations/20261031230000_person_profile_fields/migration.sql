-- Additive only: new nullable Person/ImportJobRow profile fields. No existing column or row is altered or removed.
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'SEPARATED', 'DIVORCED', 'WIDOWED');

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "gender" "Gender",
ADD COLUMN     "maritalStatus" "MaritalStatus",
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "primaryTeamId" UUID;

-- AlterTable
ALTER TABLE "ImportJobRow" ADD COLUMN     "gender" "Gender",
ADD COLUMN     "maritalStatus" "MaritalStatus",
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "primaryTeamId" UUID;

-- CreateIndex
CREATE INDEX "Person_primaryTeamId_idx" ON "Person"("primaryTeamId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_primaryTeamId_fkey" FOREIGN KEY ("primaryTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

