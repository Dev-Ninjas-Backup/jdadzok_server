-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'capLevel';
ALTER TYPE "NotificationType" ADD VALUE 'community';
ALTER TYPE "NotificationType" ADD VALUE 'comment';
ALTER TYPE "NotificationType" ADD VALUE 'userRegistration';
ALTER TYPE "NotificationType" ADD VALUE 'ngo';
ALTER TYPE "NotificationType" ADD VALUE 'Custom';
ALTER TYPE "NotificationType" ADD VALUE 'message';

-- AlterTable
ALTER TABLE "notification-toggle" ADD COLUMN     "capLevel" BOOLEAN NOT NULL DEFAULT true;
