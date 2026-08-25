-- CreateEnum
CREATE TYPE "FraudDecision" AS ENUM ('ALLOW', 'CHALLENGE', 'QUEUE', 'REJECT');

-- CreateEnum
CREATE TYPE "FraudEventType" AS ENUM ('STRIPE_ONBOARDING', 'PAYOUT', 'ACCOUNT_CHECK');

-- CreateTable
CREATE TABLE "fraud_checks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "FraudEventType" NOT NULL,
    "provider" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "decision" "FraudDecision" NOT NULL,
    "vendorRef" TEXT,
    "labels" JSONB,
    "reason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fraud_checks_userId_idx" ON "fraud_checks"("userId");

-- CreateIndex
CREATE INDEX "fraud_checks_decision_idx" ON "fraud_checks"("decision");

-- CreateIndex
CREATE INDEX "fraud_checks_eventType_idx" ON "fraud_checks"("eventType");

-- CreateIndex
CREATE INDEX "fraud_checks_createdAt_idx" ON "fraud_checks"("createdAt");

-- AddForeignKey
ALTER TABLE "fraud_checks" ADD CONSTRAINT "fraud_checks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
