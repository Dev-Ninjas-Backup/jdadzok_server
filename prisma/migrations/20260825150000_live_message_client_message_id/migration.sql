-- AlterTable
ALTER TABLE "live_messages" ADD COLUMN "clientMessageId" TEXT;

-- Partial unique: retries with the same clientMessageId must not duplicate.
-- Multiple NULL clientMessageId values remain allowed.
CREATE UNIQUE INDEX "live_messages_chat_sender_client_message_id_key"
ON "live_messages"("chatId", "senderId", "clientMessageId")
WHERE "clientMessageId" IS NOT NULL;
