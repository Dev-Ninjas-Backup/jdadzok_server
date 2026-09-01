import { GetUser, ValidateAdmin, ValidateAuth } from "@common/jwt/jwt.decorator";
import { PrismaService } from "@lib/prisma/prisma.service";
import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { LiveChatContext } from "@prisma/client";
import { ActiveUsersService } from "./active-user.service";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";
import { CreateMessageDto } from "./dto/create.message.dto";
import { StartPrivateChatDto } from "./dto/start-private.dto";

@ApiTags("Chat API operations")
@ApiBearerAuth()
@Controller("chat")
export class ChatController {
    constructor(
        private chatService: ChatService,
        private chatGateway: ChatGateway,
        private activeUsersService: ActiveUsersService,
        private prisma: PrismaService,
    ) {}

    @Post("support")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Start or get existing support chat with platform support" })
    async startSupportChat(@GetUser("userId") userId: string) {
        return this.chatService.getOrCreateSupportChat(userId);
    }

    @Get("support/queue")
    @ValidateAdmin()
    @ApiBearerAuth()
    @ApiOperation({ summary: "List support chats assigned to the support inbox (admin only)" })
    async getSupportQueue(@GetUser("userId") userId: string) {
        return this.chatService.getSupportQueue(userId);
    }

    @Post("private")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Start or get existing general private chat (mutual Connect required)",
    })
    async startPrivateChat(@GetUser("userId") userId: string, @Body() dto: StartPrivateChatDto) {
        return this.chatService.getOrCreatePrivateChat(userId, dto.otherUserId);
    }

    @Post("mentorship/private")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({
        summary:
            "Start or get mentorship chat with another member (accepted volunteer application or Bridge mentorship booking)",
    })
    async startMentorshipChat(@GetUser("userId") userId: string, @Body() dto: StartPrivateChatDto) {
        return this.chatService.getOrCreateMentorshipChat(userId, dto.otherUserId);
    }

    @Get("my")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get all my chats with unread count and last message" })
    @ApiQuery({
        name: "context",
        required: false,
        enum: LiveChatContext,
        description: "Filter inbox: GENERAL, MENTORSHIP, or SUPPORT",
    })
    @ApiResponse({ status: 200, description: "List of user chats with metadata" })
    async getMyChats(
        @GetUser("userId") userId: string,
        @Query("context") context?: LiveChatContext,
    ) {
        return this.chatService.getMyChats(userId, context);
    }

    @Get("active-users")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get all currently active users" })
    @ApiResponse({ status: 200, description: "List of active users with details" })
    async getActiveUsers() {
        const userIds = await this.activeUsersService.getActiveUsers();

        if (!userIds || userIds.length === 0) {
            return {
                count: 0,
                users: [],
            };
        }

        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                email: true,
                profile: {
                    select: {
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        return {
            count: users.length,
            users,
        };
    }

    @Get("active-users/count")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get count of active users" })
    @ApiResponse({ status: 200, description: "Active user count" })
    async getActiveUserCount() {
        const count = await this.activeUsersService.getActiveUserCount();
        return { count };
    }

    @Get("chat/:otherUserId")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get or create a private chat with another user" })
    async getOrCreatePrivateChatId(
        @GetUser("userId") userId: string,
        @Param("otherUserId") otherUserId: string,
    ) {
        return this.chatService.getOrCreatePrivateChatId(userId, otherUserId);
    }

    @Get(":chatId")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get chat details by ID" })
    async getChatById(@GetUser("userId") userId: string, @Param("chatId") chatId: string) {
        return this.chatService.getChatById(chatId, userId);
    }

    @Get(":chatId/messages")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Get paginated messages for a chat (cursor = last message id)",
    })
    @ApiQuery({
        name: "cursor",
        required: false,
        description: "Last message id from previous page",
    })
    @ApiQuery({ name: "limit", required: false, description: "Page size (default 50, max 100)" })
    async getMessages(
        @GetUser("userId") userId: string,
        @Param("chatId") chatId: string,
        @Query("cursor") cursor?: string,
        @Query("limit") limit?: string,
    ) {
        return this.chatService.getMessages(chatId, userId, {
            cursor,
            limit: limit ? Number(limit) : undefined,
        });
    }

    @Post(":chatId/messages")
    @ValidateAuth()
    @ApiOperation({
        summary: "Send a message in a chat (emits chat:message_receive / chat:message_sent)",
    })
    async sendMessage(
        @GetUser("userId") userId: string,
        @Param("chatId") chatId: string,
        @Body() dto: CreateMessageDto,
    ) {
        const message = await this.chatService.createMessage(userId, chatId, dto);
        try {
            await this.chatGateway.notifyMessageCreated(message);
        } catch {
            // Persist succeeded; realtime emit is best-effort so HTTP clients still get the row.
        }
        return message;
    }

    @Patch("messages/:messageId/read")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Mark a message as read" })
    async markMessageAsRead(
        @GetUser("userId") userId: string,
        @Param("messageId") messageId: string,
    ) {
        return this.chatService.markRead(messageId, userId);
    }

    @Get(":chatId/unread-count")
    @ValidateAuth()
    @ApiOperation({ summary: "Get unread message count for a specific chat" })
    @ApiResponse({ status: 200, description: "Unread count retrieved successfully" })
    @ApiResponse({ status: 404, description: "Chat not found" })
    async getUnreadCount(@GetUser("userId") userId: string, @Param("chatId") chatId: string) {
        return this.chatService.getUnreadCount(chatId, userId);
    }

    @Get(":chatId/typing")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get users currently typing in a chat" })
    @ApiResponse({ status: 200, description: "List of user IDs typing" })
    async getUsersTyping(@Param("chatId") chatId: string) {
        const userIds = await this.activeUsersService.getUsersTyping(chatId);

        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                profile: {
                    select: {
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        return { users };
    }
}
