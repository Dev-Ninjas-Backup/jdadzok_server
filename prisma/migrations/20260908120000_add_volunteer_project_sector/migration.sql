-- CreateEnum
CREATE TYPE "Sector" AS ENUM ('HEALTH', 'EDUCATION', 'TECHNOLOGY', 'AGRICULTURE', 'ARTS', 'BUSINESS', 'OTHER');

-- AlterTable
ALTER TABLE "VolunteerProject" ADD COLUMN "sector" "Sector" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "VolunteerProject_sector_idx" ON "VolunteerProject"("sector");
