-- CreateEnum
CREATE TYPE "CapPromotionAction" AS ENUM ('AUTO_PROMOTED', 'ADMIN_PROMOTED', 'ADMIN_OVERRIDE', 'ADMIN_REJECTED');

-- CreateTable
CREATE TABLE "cap_promotion_audits" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "fromLevel" "CapLevel" NOT NULL,
    "toLevel" "CapLevel" NOT NULL,
    "action" "CapPromotionAction" NOT NULL,
    "bypassVerification" BOOLEAN NOT NULL DEFAULT false,
    "bypassReason" TEXT,
    "reviewNotes" TEXT,
    "volunteerHoursAtPromotion" INTEGER,
    "activityScoreAtPromotion" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cap_promotion_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cap_promotion_audits_userId_idx" ON "cap_promotion_audits"("userId");
CREATE INDEX "cap_promotion_audits_toLevel_idx" ON "cap_promotion_audits"("toLevel");
CREATE INDEX "cap_promotion_audits_actorId_idx" ON "cap_promotion_audits"("actorId");
CREATE INDEX "cap_promotion_audits_createdAt_idx" ON "cap_promotion_audits"("createdAt");

-- AddForeignKey
ALTER TABLE "cap_promotion_audits" ADD CONSTRAINT "cap_promotion_audits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cap_promotion_audits" ADD CONSTRAINT "cap_promotion_audits_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
