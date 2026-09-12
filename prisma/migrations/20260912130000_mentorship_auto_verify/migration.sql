-- AlterTable
ALTER TABLE "call_participants" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "call_participants_userId_idx" ON "call_participants"("userId");

-- AddForeignKey
ALTER TABLE "call_participants" ADD CONSTRAINT "call_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "VolunteerHour" ADD COLUMN "autoVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "VolunteerHour_autoVerifiedAt_idx" ON "VolunteerHour"("autoVerifiedAt");
