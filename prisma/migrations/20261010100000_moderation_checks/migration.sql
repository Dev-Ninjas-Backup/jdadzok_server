-- CreateEnum
CREATE TYPE "ModerationDecision" AS ENUM ('ALLOW', 'QUEUE', 'REJECT');

-- CreateEnum
CREATE TYPE "ModerationSubjectType" AS ENUM ('POST');

-- CreateTable
CREATE TABLE "moderation_checks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectType" "ModerationSubjectType" NOT NULL,
    "subjectId" TEXT,
    "provider" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "decision" "ModerationDecision" NOT NULL,
    "vendorRef" TEXT,
    "labels" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "moderation_checks_userId_idx" ON "moderation_checks"("userId");

-- CreateIndex
CREATE INDEX "moderation_checks_decision_idx" ON "moderation_checks"("decision");

-- CreateIndex
CREATE INDEX "moderation_checks_subjectType_subjectId_idx" ON "moderation_checks"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "moderation_checks_createdAt_idx" ON "moderation_checks"("createdAt");

-- AddForeignKey
ALTER TABLE "moderation_checks" ADD CONSTRAINT "moderation_checks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
