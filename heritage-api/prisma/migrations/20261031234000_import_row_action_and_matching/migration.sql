-- CreateEnum
CREATE TYPE "ImportRowAction" AS ENUM ('CREATE', 'UPDATE_EXISTING', 'SKIP');

-- AlterTable
ALTER TABLE "ImportJobRow" ADD COLUMN     "action" "ImportRowAction" NOT NULL DEFAULT 'CREATE';

-- AddForeignKey
ALTER TABLE "ImportJobRow" ADD CONSTRAINT "ImportJobRow_matchedPersonId_fkey" FOREIGN KEY ("matchedPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

