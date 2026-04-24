/*
  Warnings:

  - The values [ACTIVE,CANCELLED,MISSED,DECLINED] on the enum `CallStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [capLevel,community,comment,userRegistration,ngo,Custom,message,Post] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CallStatus_new" AS ENUM ('CALLING', 'CONNECTED', 'ENDED');
ALTER TABLE "public"."calls" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "calls" ALTER COLUMN "status" TYPE "CallStatus_new" USING ("status"::text::"CallStatus_new");
ALTER TYPE "CallStatus" RENAME TO "CallStatus_old";
ALTER TYPE "CallStatus_new" RENAME TO "CallStatus";
DROP TYPE "public"."CallStatus_old";
ALTER TABLE "calls" ALTER COLUMN "status" SET DEFAULT 'CALLING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('VOLUNTEER_MATCH', 'SYSTEM', 'CAP_UPGRADE', 'LIKE', 'COMMENT', 'FOLLOW', 'SHARE', 'MENTION', 'EARNINGS');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;
