/*
  Warnings:

  - You are about to drop the column `roomId` on the `calls` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."calls_roomId_idx";

-- DropIndex
DROP INDEX "public"."calls_roomId_key";

-- AlterTable
ALTER TABLE "calls" DROP COLUMN "roomId";
