-- CreateEnum
CREATE TYPE "CallPurpose" AS ENUM ('GENERAL', 'MENTORSHIP');

-- AlterTable Calling
ALTER TABLE "calls" ADD COLUMN "callPurpose" "CallPurpose" NOT NULL DEFAULT 'GENERAL';

-- AlterTable VolunteerHour
ALTER TABLE "VolunteerHour" ALTER COLUMN "applicationId" DROP NOT NULL;
ALTER TABLE "VolunteerHour" ALTER COLUMN "hours" SET DATA TYPE DOUBLE PRECISION;
ALTER TABLE "VolunteerHour" ADD COLUMN "callId" TEXT;
ALTER TABLE "VolunteerHour" ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "VolunteerHour_callId_key" ON "VolunteerHour"("callId");
CREATE INDEX "VolunteerHour_loggedByUserId_idx" ON "VolunteerHour"("loggedByUserId");
CREATE INDEX "VolunteerHour_applicationId_idx" ON "VolunteerHour"("applicationId");
CREATE INDEX "calls_callPurpose_idx" ON "calls"("callPurpose");

-- AddForeignKey
ALTER TABLE "VolunteerHour" ADD CONSTRAINT "VolunteerHour_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE SET NULL ON UPDATE CASCADE;
