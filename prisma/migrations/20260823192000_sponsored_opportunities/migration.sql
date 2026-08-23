-- CreateEnum
CREATE TYPE "SponsoredTargetType" AS ENUM ('VOLUNTEER_PROJECT', 'BRIDGE_LISTING');

-- CreateTable
CREATE TABLE "sponsored_opportunities" (
    "id" TEXT NOT NULL,
    "corporateMembershipId" TEXT NOT NULL,
    "targetType" "SponsoredTargetType" NOT NULL,
    "volunteerProjectId" TEXT,
    "bridgeListingId" TEXT,
    "title" TEXT,
    "message" TEXT,
    "budgetAmount" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sponsored_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sponsored_opportunities_corporateMembershipId_idx" ON "sponsored_opportunities"("corporateMembershipId");
CREATE INDEX "sponsored_opportunities_targetType_active_idx" ON "sponsored_opportunities"("targetType", "active");
CREATE INDEX "sponsored_opportunities_volunteerProjectId_idx" ON "sponsored_opportunities"("volunteerProjectId");
CREATE INDEX "sponsored_opportunities_bridgeListingId_idx" ON "sponsored_opportunities"("bridgeListingId");

-- AddForeignKey
ALTER TABLE "sponsored_opportunities" ADD CONSTRAINT "sponsored_opportunities_corporateMembershipId_fkey" FOREIGN KEY ("corporateMembershipId") REFERENCES "corporate_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sponsored_opportunities" ADD CONSTRAINT "sponsored_opportunities_volunteerProjectId_fkey" FOREIGN KEY ("volunteerProjectId") REFERENCES "VolunteerProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sponsored_opportunities" ADD CONSTRAINT "sponsored_opportunities_bridgeListingId_fkey" FOREIGN KEY ("bridgeListingId") REFERENCES "bridge_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
