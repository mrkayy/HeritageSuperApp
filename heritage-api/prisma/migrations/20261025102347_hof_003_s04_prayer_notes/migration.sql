-- CreateTable
CREATE TABLE "AuthMethod" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSub" TEXT NOT NULL,
    "providerEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthMethod_accountId_idx" ON "AuthMethod"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthMethod_provider_providerSub_key" ON "AuthMethod"("provider", "providerSub");

-- AddForeignKey
ALTER TABLE "AuthMethod" ADD CONSTRAINT "AuthMethod_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
