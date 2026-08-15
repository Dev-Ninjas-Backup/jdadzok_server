-- CreateEnum
CREATE TYPE "BridgeListingType" AS ENUM ('EXPERTISE', 'GIG', 'PROJECT_HELP');
CREATE TYPE "BridgeListingStatus" AS ENUM ('DRAFT', 'OPEN', 'PAUSED', 'CLOSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "BridgeBookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "bridge_listings" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "BridgeListingType" NOT NULL,
    "status" "BridgeListingStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skills" TEXT[],
    "location" TEXT,
    "remoteOk" BOOLEAN NOT NULL DEFAULT true,
    "ownerCapLevel" "CapLevel" NOT NULL DEFAULT 'NONE',
    "hourlyRate" DOUBLE PRECISION,
    "availabilityNote" TEXT,
    "budgetAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "platformFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bridge_listings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "bridge_bookings" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "status" "BridgeBookingStatus" NOT NULL DEFAULT 'PENDING',
    "agreedAmount" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bridge_bookings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bridge_listings_type_status_idx" ON "bridge_listings"("type", "status");
CREATE INDEX "bridge_listings_ownerId_idx" ON "bridge_listings"("ownerId");
CREATE INDEX "bridge_listings_ownerCapLevel_idx" ON "bridge_listings"("ownerCapLevel");
CREATE INDEX "bridge_listings_createdAt_idx" ON "bridge_listings"("createdAt");
CREATE INDEX "bridge_bookings_listingId_idx" ON "bridge_bookings"("listingId");
CREATE INDEX "bridge_bookings_clientId_idx" ON "bridge_bookings"("clientId");
CREATE INDEX "bridge_bookings_providerId_idx" ON "bridge_bookings"("providerId");
CREATE INDEX "bridge_bookings_status_idx" ON "bridge_bookings"("status");

ALTER TABLE "bridge_listings" ADD CONSTRAINT "bridge_listings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bridge_bookings" ADD CONSTRAINT "bridge_bookings_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "bridge_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bridge_bookings" ADD CONSTRAINT "bridge_bookings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bridge_bookings" ADD CONSTRAINT "bridge_bookings_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
