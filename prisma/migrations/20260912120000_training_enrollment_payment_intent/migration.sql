-- AlterTable
ALTER TABLE "training_enrollments" ADD COLUMN "stripePaymentIntentId" TEXT;

-- CreateIndex
CREATE INDEX "training_enrollments_stripePaymentIntentId_idx" ON "training_enrollments"("stripePaymentIntentId");
