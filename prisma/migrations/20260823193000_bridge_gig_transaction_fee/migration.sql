-- Bridge paid-gig transaction fee breakdown on bookings
CREATE TYPE "BridgeBookingSettlementStatus" AS ENUM ('NONE', 'PENDING', 'READY', 'SETTLED');

ALTER TABLE "bridge_bookings" ADD COLUMN "platformFeePercent" DOUBLE PRECISION;
ALTER TABLE "bridge_bookings" ADD COLUMN "platformFeeAmount" DOUBLE PRECISION;
ALTER TABLE "bridge_bookings" ADD COLUMN "providerPayoutAmount" DOUBLE PRECISION;
ALTER TABLE "bridge_bookings" ADD COLUMN "currency" TEXT;
ALTER TABLE "bridge_bookings" ADD COLUMN "settlementStatus" "BridgeBookingSettlementStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "bridge_bookings" ADD COLUMN "completedAt" TIMESTAMP(3);
