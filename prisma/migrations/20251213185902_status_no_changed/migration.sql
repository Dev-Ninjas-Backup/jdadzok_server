/*
  Warnings:

  - The values [CONNECTED] on the enum `CallStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CallStatus_new" AS ENUM ('CALLING', 'RINING', 'ACTIVE', 'END', 'MISSED', 'DECLINED');
ALTER TABLE "public"."calls" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "calls" ALTER COLUMN "status" TYPE "CallStatus_new" USING ("status"::text::"CallStatus_new");
ALTER TYPE "CallStatus" RENAME TO "CallStatus_old";
ALTER TYPE "CallStatus_new" RENAME TO "CallStatus";
DROP TYPE "public"."CallStatus_old";
ALTER TABLE "calls" ALTER COLUMN "status" SET DEFAULT 'CALLING';
COMMIT;
