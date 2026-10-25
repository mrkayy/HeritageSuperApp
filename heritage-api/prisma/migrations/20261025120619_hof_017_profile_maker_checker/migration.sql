DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SundaySchoolStatus') THEN
    CREATE TYPE "SundaySchoolStatus" AS ENUM ('NOT_STARTED', 'MODULE_1_IN_PROGRESS', 'MODULE_1_COMPLETED', 'MODULE_2_IN_PROGRESS', 'MODULE_2_COMPLETED', 'MODULE_3_IN_PROGRESS', 'COMPLETED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProposalStatus') THEN
    CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

ALTER TYPE "AcademyModuleCode" ADD VALUE IF NOT EXISTS 'SUNDAY_SCHOOL_101';
ALTER TYPE "AcademyModuleCode" ADD VALUE IF NOT EXISTS 'SUNDAY_SCHOOL_102';
ALTER TYPE "AcademyModuleCode" ADD VALUE IF NOT EXISTS 'SUNDAY_SCHOOL_103';

ALTER TYPE "MembershipStatus" ADD VALUE IF NOT EXISTS 'WORK_FORCE';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'JourneyTransition' AND column_name = 'fromSundaySchoolStatus') THEN
    ALTER TABLE "JourneyTransition" ADD COLUMN "fromSundaySchoolStatus" "SundaySchoolStatus";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'JourneyTransition' AND column_name = 'toSundaySchoolStatus') THEN
    ALTER TABLE "JourneyTransition" ADD COLUMN "toSundaySchoolStatus" "SundaySchoolStatus";
  END IF;
END $$;

ALTER TABLE "JourneyTransition" ALTER COLUMN "toFoundationStatus" DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Person' AND column_name = 'sundaySchoolStatus') THEN
    ALTER TABLE "Person" ADD COLUMN "sundaySchoolStatus" "SundaySchoolStatus" NOT NULL DEFAULT 'NOT_STARTED';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ProfileChangeProposal" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "baseVersion" INTEGER NOT NULL,
    "makerId" UUID NOT NULL,
    "changes" JSONB NOT NULL,
    "reason" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "checkerId" UUID,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ProfileChangeProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProfileChangeProposal_personId_idx" ON "ProfileChangeProposal"("personId");
CREATE INDEX IF NOT EXISTS "ProfileChangeProposal_status_idx" ON "ProfileChangeProposal"("status");
CREATE INDEX IF NOT EXISTS "ProfileChangeProposal_makerId_idx" ON "ProfileChangeProposal"("makerId");
CREATE INDEX IF NOT EXISTS "ProfileChangeProposal_checkerId_idx" ON "ProfileChangeProposal"("checkerId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProfileChangeProposal_personId_fkey') THEN
    ALTER TABLE "ProfileChangeProposal" ADD CONSTRAINT "ProfileChangeProposal_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProfileChangeProposal_makerId_fkey') THEN
    ALTER TABLE "ProfileChangeProposal" ADD CONSTRAINT "ProfileChangeProposal_makerId_fkey" FOREIGN KEY ("makerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ProfileChangeProposal_checkerId_fkey') THEN
    ALTER TABLE "ProfileChangeProposal" ADD CONSTRAINT "ProfileChangeProposal_checkerId_fkey" FOREIGN KEY ("checkerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
