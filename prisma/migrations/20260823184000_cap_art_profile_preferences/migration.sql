-- CreateEnum
CREATE TYPE "CapArtStyle" AS ENUM ('STRUCTURED', 'SOFT');

-- CreateEnum
CREATE TYPE "CapArtPlacement" AS ENUM ('WORN', 'BESIDE');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "capArtStyle" "CapArtStyle" NOT NULL DEFAULT 'STRUCTURED';
ALTER TABLE "profiles" ADD COLUMN "capArtPlacement" "CapArtPlacement" NOT NULL DEFAULT 'BESIDE';
