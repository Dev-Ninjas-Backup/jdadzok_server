-- AlterTable
ALTER TABLE "VolunteerHour" ADD COLUMN "counterpartyUserId" TEXT;
ALTER TABLE "VolunteerHour" ADD COLUMN "counterpartyConfirmedAt" TIMESTAMP(3);
ALTER TABLE "VolunteerHour" ADD COLUMN "counterpartyConfirmationNote" TEXT;

-- Backfill: already-verified mentorship calls treated as counterparty-confirmed
UPDATE "VolunteerHour"
SET "counterpartyConfirmedAt" = "createdAt"
WHERE "source" = 'MENTORSHIP_CALL'
  AND "verificationStatus" = 'VERIFIED';

-- CreateIndex
CREATE INDEX "VolunteerHour_counterpartyUserId_idx" ON "VolunteerHour"("counterpartyUserId");

-- AddForeignKey
ALTER TABLE "VolunteerHour" ADD CONSTRAINT "VolunteerHour_counterpartyUserId_fkey" FOREIGN KEY ("counterpartyUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
