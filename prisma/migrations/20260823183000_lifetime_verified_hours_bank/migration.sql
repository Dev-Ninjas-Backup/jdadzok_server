-- AlterTable
ALTER TABLE "user_metrics" ADD COLUMN "lifetimeVerifiedVolunteerHours" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill from verified VolunteerHour rows (lifetime bank across projects)
UPDATE "user_metrics" um
SET
  "lifetimeVerifiedVolunteerHours" = COALESCE(sub.total_hours, 0),
  "volunteerHours" = CEIL(COALESCE(sub.total_hours, 0))::INTEGER
FROM (
  SELECT "loggedByUserId", SUM("hours") AS total_hours
  FROM "VolunteerHour"
  WHERE "verificationStatus" = 'VERIFIED'
  GROUP BY "loggedByUserId"
) sub
WHERE um."userId" = sub."loggedByUserId";
