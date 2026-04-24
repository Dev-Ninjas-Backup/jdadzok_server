/*
  Warnings:

  - A unique constraint covering the columns `[roomId]` on the table `calls` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "calls" ADD COLUMN     "roomId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "calls_roomId_key" ON "calls"("roomId");

-- CreateIndex
CREATE INDEX "calls_roomId_idx" ON "calls"("roomId");
