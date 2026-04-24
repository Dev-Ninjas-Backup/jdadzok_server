-- AlterTable
ALTER TABLE "calls" ADD COLUMN     "recipientUserId" TEXT;

-- CreateIndex
CREATE INDEX "calls_hostUserId_idx" ON "calls"("hostUserId");

-- CreateIndex
CREATE INDEX "calls_recipientUserId_idx" ON "calls"("recipientUserId");

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
