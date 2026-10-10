-- AlterTable
ALTER TABLE "cap_requirements" ADD COLUMN     "minDaysAtPreviousLevel" INTEGER;
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "capLevelChangedAt" TIMESTAMP(3);
