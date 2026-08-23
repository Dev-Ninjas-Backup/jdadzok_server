-- Employer talent-sourcing: candidate unlocks + member opt-in + usage counter
ALTER TABLE "profiles" ADD COLUMN "isTalentSearchOptIn" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "corporate_memberships" ADD COLUMN "talentUnlocksUsed" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "talent_candidate_unlocks" (
    "id" TEXT NOT NULL,
    "corporateMembershipId" TEXT NOT NULL,
    "candidateUserId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "talent_candidate_unlocks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "talent_candidate_unlocks_corporateMembershipId_candidateUserId_key" ON "talent_candidate_unlocks"("corporateMembershipId", "candidateUserId");
CREATE INDEX "talent_candidate_unlocks_corporateMembershipId_idx" ON "talent_candidate_unlocks"("corporateMembershipId");
CREATE INDEX "talent_candidate_unlocks_candidateUserId_idx" ON "talent_candidate_unlocks"("candidateUserId");

ALTER TABLE "talent_candidate_unlocks" ADD CONSTRAINT "talent_candidate_unlocks_corporateMembershipId_fkey" FOREIGN KEY ("corporateMembershipId") REFERENCES "corporate_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "talent_candidate_unlocks" ADD CONSTRAINT "talent_candidate_unlocks_candidateUserId_fkey" FOREIGN KEY ("candidateUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
