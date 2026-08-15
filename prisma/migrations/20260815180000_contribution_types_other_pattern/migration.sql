-- CreateEnum
CREATE TYPE "ContributionType" AS ENUM ('MENTORING', 'ADVICE', 'PROJECT', 'TEACHING', 'CHARITY', 'OTHER');

-- AlterTable Profile
ALTER TABLE "profiles" ADD COLUMN "interestOtherText" TEXT;

-- AlterTable VolunteerHour
ALTER TABLE "VolunteerHour" ADD COLUMN "contributionType" "ContributionType";
ALTER TABLE "VolunteerHour" ADD COLUMN "contributionOther" TEXT;
CREATE INDEX "VolunteerHour_contributionType_idx" ON "VolunteerHour"("contributionType");

-- AlterTable BridgeListing
ALTER TABLE "bridge_listings" ADD COLUMN "contributionType" "ContributionType";
ALTER TABLE "bridge_listings" ADD COLUMN "contributionOther" TEXT;
CREATE INDEX "bridge_listings_contributionType_idx" ON "bridge_listings"("contributionType");
