-- Backfill canonical follows table from legacy UserFollow rows (skip duplicates).
INSERT INTO "follows" ("id", "followerId", "followingId", "createdAt")
SELECT gen_random_uuid(), uf."followerId", uf."followedId", uf."createdAt"
FROM "UserFollow" uf
WHERE NOT EXISTS (
    SELECT 1
    FROM "follows" f
    WHERE f."followerId" = uf."followerId"
      AND f."followingId" = uf."followedId"
);

-- Drop legacy duplicate follow table.
DROP TABLE "UserFollow";
