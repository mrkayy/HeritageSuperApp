-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_personId_fkey";

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "pinHash" TEXT;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" UUID;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
