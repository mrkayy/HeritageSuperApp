-- CreateEnum
CREATE TYPE "VolunteerApplicationStatus" AS ENUM ('SUBMITTED', 'PROBATIONARY', 'PLACED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "VolunteerApplication" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "primaryDepartment" TEXT NOT NULL,
    "secondaryDepartment" TEXT NOT NULL,
    "skills" TEXT,
    "availability" TEXT,
    "status" "VolunteerApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "probationStartedAt" TIMESTAMP(3),
    "probationEndedAt" TIMESTAMP(3),
    "placedDepartment" TEXT,
    "placedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VolunteerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerApplication_idempotencyKey_key" ON "VolunteerApplication"("idempotencyKey");

-- CreateIndex
CREATE INDEX "VolunteerApplication_personId_status_idx" ON "VolunteerApplication"("personId", "status");

-- CreateIndex
CREATE INDEX "VolunteerApplication_status_idx" ON "VolunteerApplication"("status");

-- AddForeignKey
ALTER TABLE "VolunteerApplication" ADD CONSTRAINT "VolunteerApplication_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
