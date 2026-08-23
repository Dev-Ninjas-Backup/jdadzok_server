-- Rename corporate tier enum values to June 26 landing names (Starter / Growth / Enterprise).
ALTER TYPE "MembershipTier" RENAME VALUE 'SILVER' TO 'STARTER';
ALTER TYPE "MembershipTier" RENAME VALUE 'GOLD' TO 'GROWTH';
ALTER TYPE "MembershipTier" RENAME VALUE 'PLATINUM' TO 'ENTERPRISE';

ALTER TABLE "corporate_memberships" ALTER COLUMN "tier" SET DEFAULT 'STARTER';

-- SDG / ESG reporting fields for CSR dashboard
ALTER TABLE "corporate_memberships" ADD COLUMN "sdgAlignmentGoals" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "corporate_memberships" ADD COLUMN "sdgImpactSummary" TEXT;
ALTER TABLE "corporate_memberships" ADD COLUMN "esgReportPeriod" TEXT;
ALTER TABLE "corporate_memberships" ADD COLUMN "esgReportUrl" TEXT;
ALTER TABLE "corporate_memberships" ADD COLUMN "reportedVolunteerHours" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "corporate_memberships" ADD COLUMN "reportedCommunityInvestment" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "corporate_memberships" ADD COLUMN "reportedCarbonOffsetTonnes" DOUBLE PRECISION;
ALTER TABLE "corporate_memberships" ADD COLUMN "lastEsgReportSubmittedAt" TIMESTAMP(3);
