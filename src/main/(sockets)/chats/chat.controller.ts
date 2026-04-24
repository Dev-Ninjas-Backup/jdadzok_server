import { GetUser, ValidateAuth } from "@common/jwt/jwt.decorator";
import { PrismaService } from "@lib/prisma/prisma.service";
import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ActiveUsersService } from "./active-user.service";
import { ChatService } from "./chat.service";
import { CreateMessageDto } from "./dto/create.message.dto";
import { StartPrivateChatDto } from "./dto/start-private.dto";

@ApiTags("Chat API operations")
@ApiBearerAuth()
@Controller("chat")
export class ChatController {
    constructor(
        private chatService: ChatService,
        private activeUsersService: ActiveUsersService,
        private prisma: PrismaService,
    ) {}

    @Post("private")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Start or get existing private chat with another user" })
    async startPrivateChat(@GetUser("userId") userId: string, @Body() dto: StartPrivateChatDto) {
        return this.chatService.getOrCreatePrivateChat(userId, dto.otherUserId);
    }

    @Get("my")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get all my chats with unread count and last message" })
    @ApiResponse({ status: 200, description: "List of user chats with metadata" })
    async getMyChats(@GetUser("userId") userId: string) {
        return this.chatService.getMyChats(userId);
    }

    @Get(":chatId")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get chat details by ID" })
    async getChatById(@GetUser("userId") userId: string, @Param("chatId") chatId: string) {
        return this.chatService.getChatById(chatId, userId);
    }

    // -------------- Messages ----------------
    @Get(":chatId/messages")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Get paginated messages for a specific chat chat id || last message id cursor",
    })
    async getMessages(@Param("chatId") chatId: string) {
        return this.chatService.getMessages(chatId);
    }

    @Post(":chatId/messages")
    @ValidateAuth()
    @ApiOperation({ summary: "Send a message in a chat" })
    async sendMessage(
        @GetUser("userId") userId: string,
        @Param("chatId") chatId: string,
        @Body() dto: CreateMessageDto,
    ) {
        return this.chatService.createMessage(userId, chatId, dto);
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

    @Get("active-users")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get all currently active users" })
    @ApiResponse({ status: 200, description: "List of active users with details" })
    async getActiveUsers() {
        // Get active user IDs from Redis
        const userIds = await this.activeUsersService.getActiveUsers();

        // If no active users, return empty array
        if (!userIds || userIds.length === 0) {
            return {
                count: 0,
                users: [],
            };
        }

        // Get user details from database
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
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get count of active users" })
    @ApiResponse({ status: 200, description: "Active user count" })
    async getActiveUserCount() {
        const count = await this.activeUsersService.getActiveUserCount();
        return { count };
    }

    @Get(":chatId/typing")
    @ValidateAuth()
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
    // ---------------- two user id & get chat id----------------
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
}
