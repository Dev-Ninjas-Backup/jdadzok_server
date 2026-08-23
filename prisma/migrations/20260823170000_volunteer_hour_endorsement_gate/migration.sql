-- CreateEnum
CREATE TYPE "VolunteerHourVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VolunteerHourSource" AS ENUM ('SELF_REPORT', 'MENTORSHIP_CALL');

-- AlterTable
ALTER TABLE "VolunteerHour" ADD COLUMN "verificationStatus" "VolunteerHourVerificationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "VolunteerHour" ADD COLUMN "source" "VolunteerHourSource" NOT NULL DEFAULT 'SELF_REPORT';
ALTER TABLE "VolunteerHour" ADD COLUMN "endorsedByUserId" TEXT;
ALTER TABLE "VolunteerHour" ADD COLUMN "endorsedAt" TIMESTAMP(3);
ALTER TABLE "VolunteerHour" ADD COLUMN "rejectionNote" TEXT;

-- AlterTable
ALTER TABLE "endorsements" ADD COLUMN "volunteerHourId" TEXT;

-- Backfill: existing verified rows (mentorship calls)
UPDATE "VolunteerHour"
SET "verificationStatus" = 'VERIFIED',
    "source" = 'MENTORSHIP_CALL'
WHERE "isVerified" = true AND "callId" IS NOT NULL;

UPDATE "VolunteerHour"
SET "verificationStatus" = 'VERIFIED'
WHERE "isVerified" = true AND "callId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "endorsements_volunteerHourId_key" ON "endorsements"("volunteerHourId");
CREATE INDEX "VolunteerHour_verificationStatus_idx" ON "VolunteerHour"("verificationStatus");
CREATE INDEX "VolunteerHour_endorsedByUserId_idx" ON "VolunteerHour"("endorsedByUserId");

-- AddForeignKey
ALTER TABLE "VolunteerHour" ADD CONSTRAINT "VolunteerHour_endorsedByUserId_fkey" FOREIGN KEY ("endorsedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "endorsements" ADD CONSTRAINT "endorsements_volunteerHourId_fkey" FOREIGN KEY ("volunteerHourId") REFERENCES "VolunteerHour"("id") ON DELETE SET NULL ON UPDATE CASCADE;
