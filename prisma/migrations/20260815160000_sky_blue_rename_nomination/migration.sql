-- Rename CapLevel enum value OSTRICH_FEATHER → SKY_BLUE
ALTER TYPE "CapLevel" RENAME VALUE 'OSTRICH_FEATHER' TO 'SKY_BLUE';

-- CreateEnum
CREATE TYPE "SkyBlueNominationStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateTable
CREATE TABLE "sky_blue_nominations" (
    "id" TEXT NOT NULL,
    "nomineeId" TEXT NOT NULL,
    "nominatedById" TEXT NOT NULL,
    "status" "SkyBlueNominationStatus" NOT NULL DEFAULT 'PENDING',
    "kycVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycVerifiedAt" TIMESTAMP(3),
    "kycVerifiedById" TEXT,
    "kycNotes" TEXT,
    "notabilityVerified" BOOLEAN NOT NULL DEFAULT false,
    "notabilityVerifiedAt" TIMESTAMP(3),
    "notabilityVerifiedById" TEXT,
    "notabilityNotes" TEXT,
    "decisionNotes" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sky_blue_nominations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sky_blue_nomination_events" (
    "id" TEXT NOT NULL,
    "nominationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sky_blue_nomination_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sky_blue_nominations_nomineeId_idx" ON "sky_blue_nominations"("nomineeId");
CREATE INDEX "sky_blue_nominations_status_idx" ON "sky_blue_nominations"("status");
CREATE INDEX "sky_blue_nominations_nominatedById_idx" ON "sky_blue_nominations"("nominatedById");
CREATE INDEX "sky_blue_nomination_events_nominationId_idx" ON "sky_blue_nomination_events"("nominationId");

ALTER TABLE "sky_blue_nominations" ADD CONSTRAINT "sky_blue_nominations_nomineeId_fkey" FOREIGN KEY ("nomineeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sky_blue_nominations" ADD CONSTRAINT "sky_blue_nominations_nominatedById_fkey" FOREIGN KEY ("nominatedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sky_blue_nomination_events" ADD CONSTRAINT "sky_blue_nomination_events_nominationId_fkey" FOREIGN KEY ("nominationId") REFERENCES "sky_blue_nominations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate cap_requirements row if present (upsert handled by seed; rename unique key value already via enum)
UPDATE "cap_requirements"
SET "description" = 'Sky Blue — invitation-only Global Changemaker. Full ad share after Black-level volunteering; earns at Red rate until then. Requires KYC + notability nomination.'
WHERE "capLevel" = 'SKY_BLUE';
