-- CreateEnum
CREATE TYPE "LiveChatContext" AS ENUM ('GENERAL', 'MENTORSHIP');

-- AlterTable
ALTER TABLE "live_chats" ADD COLUMN "context" "LiveChatContext" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "live_chats" ADD COLUMN "volunteerApplicationId" TEXT;
ALTER TABLE "live_chats" ADD COLUMN "bridgeBookingId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "live_chats_volunteerApplicationId_key" ON "live_chats"("volunteerApplicationId");
CREATE UNIQUE INDEX "live_chats_bridgeBookingId_key" ON "live_chats"("bridgeBookingId");
CREATE INDEX "live_chats_context_idx" ON "live_chats"("context");

-- AddForeignKey
ALTER TABLE "live_chats" ADD CONSTRAINT "live_chats_volunteerApplicationId_fkey" FOREIGN KEY ("volunteerApplicationId") REFERENCES "VolunteerApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "live_chats" ADD CONSTRAINT "live_chats_bridgeBookingId_fkey" FOREIGN KEY ("bridgeBookingId") REFERENCES "bridge_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
