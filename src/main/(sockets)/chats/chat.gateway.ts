import { GetSocketUser } from "@common/decorators/socket-user.decorator";
import { PrismaService } from "@lib/prisma/prisma.service";
import { UseGuards } from "@nestjs/common";
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
} from "@nestjs/websockets";
import { Socket } from "socket.io";
import { LiveChatContext } from "@prisma/client";
import { SOCKET_EVENTS } from "../constants/socket-events.constant";
import { BaseSocketGateway } from "../base/abstract-socket.gateway";
import { SocketAuthGuard } from "../guards/socket-auth.guard";
import { SocketMiddleware } from "../middleware/socket.middleware";
import { RedisService } from "../services/redis.service";
import { ActiveUsersService } from "./active-user.service";
import { ChatService } from "./chat.service";
import { CreateMessageDto } from "./dto/create.message.dto";

interface SocketUser {
    id: string;
}

type CreatedChatMessage = Awaited<ReturnType<ChatService["createMessage"]>>;

export interface ChatRealtimePayload {
    id: string;
    chatId: string;
    content: string | null;
    mediaUrl: string | null;
    mediaType: CreatedChatMessage["mediaType"];
    status: CreatedChatMessage["status"];
    clientMessageId: string | null;
    sender: CreatedChatMessage["sender"];
    receiver: CreatedChatMessage["chat"]["participants"][number]["user"] | null;
    createdAt: Date;
}

@WebSocketGateway({
    cors: { origin: "*" },
    namespace: "/chat",
})
@UseGuards(SocketAuthGuard)
export class ChatGateway extends BaseSocketGateway {
    constructor(
        private chatService: ChatService,
        private prisma: PrismaService,
        redisService: RedisService,
        socketMiddleware: SocketMiddleware,

        private activeUsersService: ActiveUsersService,
    ) {
        super(redisService, socketMiddleware);
    }

    async handleConnection(client: Socket): Promise<Socket | undefined> {
        const result = await super.handleConnection(client);
        const userId = client.data?.user?.id as string | undefined;
        if (!userId) return result;

        await this.activeUsersService.setUserOnline(userId, client.id);
        await this.joinUserChatRooms(client, userId);
        return result;
    }

    async handleDisconnect(client: Socket) {
        const redisUser = await this.redisService.getConnectedUser(client.id);
        const userId = (client.data?.user?.id as string | undefined) ?? redisUser?.id;

        await super.handleDisconnect(client);

        if (userId && !this.userHasSockets(userId)) {
            await this.activeUsersService.setUserOffline(userId);
        }
    }

    /**
     * Used by both socket `chat:message_send` and HTTP POST /chat/:chatId/messages.
     */
    async notifyMessageCreated(message: CreatedChatMessage): Promise<ChatRealtimePayload> {
        const payload = this.buildPayload(message);
        const receiverId = payload.receiver?.id;

        // New chats created after connect are not in joinUserChatRooms — join now
        // so typing + read receipts (room emits) work immediately.
        await this.joinUserSocketsToRoom(message.senderId, message.chatId);
        if (receiverId) {
            await this.joinUserSocketsToRoom(receiverId, message.chatId);
        }

        if (receiverId) {
            const delivered = await this.emitToUserViaClientsMap(
                receiverId,
                SOCKET_EVENTS.CHAT.MESSAGE_RECEIVE,
                payload,
            );
            if (delivered) {
                await this.chatService.markDelivered(message.id);
                payload.status = "DELIVERED" as ChatRealtimePayload["status"];
                await this.emitToUserViaClientsMap(
                    message.senderId,
                    SOCKET_EVENTS.CHAT.MESSAGE_DELIVERED,
                    {
                        messageId: message.id,
                        chatId: message.chatId,
                        deliveredTo: receiverId,
                        clientMessageId: message.clientMessageId ?? null,
                    },
                );
            }
        }

        await this.emitToUserViaClientsMap(
            message.senderId,
            SOCKET_EVENTS.CHAT.MESSAGE_SENT,
            payload,
        );
        return payload;
    }

    @SubscribeMessage("chat:join")
    async handleJoinChat(
        @GetSocketUser() user: SocketUser,
        @ConnectedSocket() client: Socket,
        @MessageBody() { chatId }: { chatId: string },
    ) {
        if (!chatId) return;
        try {
            await this.chatService.getChatById(chatId, user.id);
            await client.join(chatId);
        } catch {
            return client.emit("error", { message: "Cannot join chat" });
        }
    }

    @SubscribeMessage("chat:leave")
    async handleLeaveChat(
        @ConnectedSocket() client: Socket,
        @MessageBody() { chatId }: { chatId: string },
    ) {
        if (!chatId) return;
        await client.leave(chatId);
    }

    @SubscribeMessage(SOCKET_EVENTS.CHAT.MESSAGE_SEND)
    async handleMessage(
        @GetSocketUser() user: SocketUser,
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { receiverId: string; context?: LiveChatContext } & CreateMessageDto,
    ) {
        const { receiverId, context = LiveChatContext.GENERAL } = data;

        try {
            const chat =
                context === LiveChatContext.MENTORSHIP
                    ? await this.chatService.getOrCreateMentorshipChat(user.id, receiverId)
                    : await this.chatService.getOrCreatePrivateChat(user.id, receiverId);

            const message = await this.chatService.createMessage(user.id, chat.id, data);
            await this.notifyMessageCreated(message);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to send message";
            return client.emit("error", { message });
        }
    }

    @SubscribeMessage(SOCKET_EVENTS.CHAT.MESSAGE_READ)
    async handleRead(
        @GetSocketUser() user: SocketUser,
        @MessageBody() { messageId }: { messageId: string },
    ) {
        await this.chatService.markRead(messageId, user.id);

        const msg = await this.prisma.liveMessage.findUnique({
            where: { id: messageId },
            select: { chatId: true, senderId: true },
        });

        if (msg && msg.senderId !== user.id) {
            const readPayload = {
                messageId,
                chatId: msg.chatId,
                readBy: user.id,
            };
            this.server
                .to(msg.chatId)
                .except(user.id)
                .emit(SOCKET_EVENTS.CHAT.MESSAGE_READ, readPayload);
            // Ensure sender gets the receipt even if not in the room yet.
            await this.emitToUserViaClientsMap(
                msg.senderId,
                SOCKET_EVENTS.CHAT.MESSAGE_READ,
                readPayload,
            );
        }
    }

    @SubscribeMessage(SOCKET_EVENTS.CHAT.TYPING_START)
    async handleTypingStart(
        @GetSocketUser() user: SocketUser,
        @MessageBody() { chatId }: { chatId: string },
    ) {
        await this.activeUsersService.setUserTyping(chatId, user.id);

        this.server.to(chatId).except(user.id).emit(SOCKET_EVENTS.CHAT.TYPING_START, {
            userId: user.id,
            chatId,
        });
    }

    @SubscribeMessage(SOCKET_EVENTS.CHAT.TYPING_STOP)
    async handleTypingStop(
        @GetSocketUser() user: SocketUser,
        @MessageBody() { chatId }: { chatId: string },
    ) {
        await this.activeUsersService.removeUserTyping(chatId, user.id);

        this.server.to(chatId).except(user.id).emit(SOCKET_EVENTS.CHAT.TYPING_STOP, {
            userId: user.id,
            chatId,
        });
    }

    @SubscribeMessage("user:get_status")
    async handleGetUserStatus(
        @ConnectedSocket() client: Socket,
        @MessageBody() { userId }: { userId: string },
    ) {
        const presence = await this.activeUsersService.getUserPresence(userId);

        client.emit("user:status", {
            userId,
            status: presence?.status || "offline",
            lastSeen: presence?.lastSeen || null,
        });
    }

    @SubscribeMessage("user:set_status")
    async handleSetStatus(
        @GetSocketUser() user: SocketUser,
        @ConnectedSocket() client: Socket,
        @MessageBody() { status }: { status: "online" | "away" | "offline" },
    ) {
        await this.activeUsersService.setUserStatus(user.id, status, client.id);

        this.server.emit("user:status_changed", {
            userId: user.id,
            status,
            timestamp: new Date(),
        });
    }

    private buildPayload(message: CreatedChatMessage): ChatRealtimePayload {
        return {
            id: message.id,
            chatId: message.chatId,
            content: message.content,
            mediaUrl: message.mediaUrl,
            mediaType: message.mediaType,
            status: message.status,
            clientMessageId: message.clientMessageId ?? null,
            sender: message.sender,
            receiver:
                message.chat.participants
                    .map((p) => p.user)
                    .find((u) => u.id !== message.senderId) ?? null,
            createdAt: message.createdAt,
        };
    }

    private async joinUserChatRooms(client: Socket, userId: string) {
        const memberships = await this.prisma.liveChatParticipant.findMany({
            where: { userId, leftAt: null },
            select: { chatId: true },
        });
        await Promise.all(memberships.map(async (m) => client.join(m.chatId)));
    }
}
