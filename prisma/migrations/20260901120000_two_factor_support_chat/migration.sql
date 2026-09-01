-- Two-factor authentication fields on users
ALTER TABLE "users" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "twoFactorSecret" TEXT;

-- Support chat context for member ↔ support agent threads
ALTER TYPE "LiveChatContext" ADD VALUE 'SUPPORT';
