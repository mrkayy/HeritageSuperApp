-- AlterTable
ALTER TABLE "ImportJob" ADD COLUMN "serviceOccurrenceId" UUID;

-- AlterTable
ALTER TABLE "ImportJobRow" ADD COLUMN "prayerRequest" TEXT;
ALTER TABLE "ImportJobRow" ADD COLUMN "inviter" TEXT;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_serviceOccurrenceId_fkey" FOREIGN KEY ("serviceOccurrenceId") REFERENCES "ServiceOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
