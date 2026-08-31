import { PrismaService } from "@lib/prisma/prisma.service";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

import { HandleError } from "@common/error/handle-error.decorator";
import {
    ApplicationStatus,
    BridgeBookingStatus,
    ContributionType,
    LiveChat,
    LiveChatContext,
    LiveMessageStatus,
} from "@prisma/client";
import { FriendRequestService } from "@module/(users)/friend-request/friend-request.service";
import { CreateMessageDto } from "./dto/create.message.dto";

@Injectable()
export class ChatService {
    constructor(
        private prisma: PrismaService,
        private readonly friendRequestService: FriendRequestService,
    ) {}

    /** Find or create 1-to-1 general chat (requires mutual Connect). */
    @HandleError("Failed to get or create chat", "chat")
    async getOrCreatePrivateChat(userA: string, userB: string): Promise<LiveChat> {
        return this.getOrCreateIndividualChat(userA, userB, LiveChatContext.GENERAL);
    }

    /** Auto-open mentorship thread when a volunteer application is accepted. */
    async openMentorshipChatForApplication(applicationId: string): Promise<LiveChat | null> {
        const app = await this.prisma.volunteerApplication.findUnique({
            where: { id: applicationId },
            include: { project: true, mentorshipChat: true },
        });

        if (!app || app.status !== ApplicationStatus.ACCEPTED) {
            return null;
        }

        if (app.mentorshipChat) {
            return app.mentorshipChat;
        }

        return this.createIndividualChat({
            userA: app.volunteerId,
            userB: app.project.createdById,
            context: LiveChatContext.MENTORSHIP,
            createdById: app.project.createdById,
            volunteerApplicationId: app.id,
        });
    }

    /** Auto-open mentorship thread when a Bridge booking is accepted. */
    async openMentorshipChatForBridgeBooking(bookingId: string): Promise<LiveChat | null> {
        const booking = await this.prisma.bridgeBooking.findUnique({
            where: { id: bookingId },
            include: { listing: true, mentorshipChat: true },
        });

        if (!booking || booking.status !== BridgeBookingStatus.ACCEPTED) {
            return null;
        }

        const isMentorshipListing =
            booking.listing.type === "EXPERTISE" ||
            booking.listing.contributionType === ContributionType.MENTORING ||
            booking.listing.contributionType === ContributionType.ADVICE;

        if (!isMentorshipListing) {
            return null;
        }

        if (booking.mentorshipChat) {
            return booking.mentorshipChat;
        }

        return this.createIndividualChat({
            userA: booking.clientId,
            userB: booking.providerId,
            context: LiveChatContext.MENTORSHIP,
            createdById: booking.providerId,
            bridgeBookingId: booking.id,
        });
    }

    /** Find or create mentorship chat between two users with an active mentorship link. */
    @HandleError("Failed to get or create mentorship chat", "chat")
    async getOrCreateMentorshipChat(userA: string, userB: string): Promise<LiveChat> {
        await this.assertMentorshipLink(userA, userB);

        const existing = await this.findIndividualChat(userA, userB, LiveChatContext.MENTORSHIP);
        if (existing) {
            return existing;
        }

        return this.createIndividualChat({
            userA,
            userB,
            context: LiveChatContext.MENTORSHIP,
            createdById: userA,
        });
    }

    private async getOrCreateIndividualChat(
        userA: string,
        userB: string,
        context: LiveChatContext,
    ): Promise<LiveChat> {
        if (context === LiveChatContext.GENERAL) {
            await this.friendRequestService.assertConnected(userA, userB);
        } else {
            await this.assertMentorshipLink(userA, userB);
        }

        const existing = await this.findIndividualChat(userA, userB, context);
        if (existing) {
            return existing;
        }

        return this.createIndividualChat({
            userA,
            userB,
            context,
            createdById: userA,
        });
    }

    private async findIndividualChat(
        userA: string,
        userB: string,
        context: LiveChatContext,
    ): Promise<LiveChat | null> {
        const chats = await this.prisma.liveChat.findMany({
            where: {
                type: "INDIVIDUAL",
                context,
                participants: { some: { userId: userA } },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                profile: { select: { name: true, avatarUrl: true } },
                            },
                        },
                    },
                },
            },
        });

        const expectedIds = [userA, userB].sort();
        return (
            chats.find((chat) => {
                if (chat.participants.length !== 2) return false;
                const participantIds = chat.participants.map((p) => p.userId).sort();
                return participantIds[0] === expectedIds[0] && participantIds[1] === expectedIds[1];
            }) ?? null
        );
    }

    private async createIndividualChat(input: {
        userA: string;
        userB: string;
        context: LiveChatContext;
        createdById: string;
        volunteerApplicationId?: string;
        bridgeBookingId?: string;
    }): Promise<LiveChat> {
        if (input.userA === input.userB) {
            throw new ForbiddenException("Cannot create a chat with yourself");
        }

        return this.prisma.$transaction(async (tx) => {
            const chat = await tx.liveChat.create({
                data: {
                    type: "INDIVIDUAL",
                    context: input.context,
                    createdById: input.createdById,
                    volunteerApplicationId: input.volunteerApplicationId ?? null,
                    bridgeBookingId: input.bridgeBookingId ?? null,
                },
            });

            await tx.liveChatParticipant.createMany({
                data: [
                    { chatId: chat.id, userId: input.userA },
                    { chatId: chat.id, userId: input.userB },
                ],
            });

            const result = await tx.liveChat.findUnique({
                where: { id: chat.id },
                include: {
                    participants: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    profile: { select: { name: true, avatarUrl: true } },
                                },
                            },
                        },
                    },
                },
            });

            if (!result) {
                throw new Error("Failed to create chat");
            }

            return result;
        });
    }

    /** Active mentorship = accepted volunteer application or accepted Bridge mentorship booking. */
    private async assertMentorshipLink(userA: string, userB: string): Promise<void> {
        const volunteerLink = await this.prisma.volunteerApplication.findFirst({
            where: {
                status: ApplicationStatus.ACCEPTED,
                OR: [
                    { volunteerId: userA, project: { createdById: userB } },
                    { volunteerId: userB, project: { createdById: userA } },
                ],
            },
            select: { id: true },
        });

        if (volunteerLink) {
            return;
        }

        const bridgeLink = await this.prisma.bridgeBooking.findFirst({
            where: {
                status: BridgeBookingStatus.ACCEPTED,
                OR: [
                    { clientId: userA, providerId: userB },
                    { clientId: userB, providerId: userA },
                ],
                listing: {
                    OR: [
                        { type: "EXPERTISE" },
                        { contributionType: ContributionType.MENTORING },
                        { contributionType: ContributionType.ADVICE },
                    ],
                },
            },
            select: { id: true },
        });

        if (bridgeLink) {
            return;
        }

        throw new ForbiddenException(
            "Mentorship chat requires an accepted volunteer application or Bridge mentorship booking between these members.",
        );
    }

    /** Get chat by ID with verification */
    @HandleError("Failed to get chat", "chat")
    async getChatById(chatId: string, userId: string) {
        const chat = await this.prisma.liveChat.findUnique({
            where: { id: chatId },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                profile: { select: { name: true, avatarUrl: true } },
                            },
                        },
                    },
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: {
                        sender: {
                            select: {
                                id: true,
                                profile: { select: { name: true, avatarUrl: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!chat) {
            throw new NotFoundException("Chat not found");
        }

        const isParticipant = chat.participants.some((p) => p.userId === userId);
        if (!isParticipant) {
            throw new ForbiddenException("You are not a participant in this chat");
        }

        return chat;
    }

    @HandleError("Failed to send message", "message")
    async createMessage(senderId: string, chatId: string, dto: CreateMessageDto) {
        const chat = await this.prisma.liveChat.findUnique({
            where: { id: chatId },
            include: { participants: true },
        });

        if (!chat) {
            throw new NotFoundException("Chat not found");
        }

        const isParticipant = chat.participants.some((p) => p.userId === senderId);
        if (!isParticipant) {
            throw new ForbiddenException("You are not a participant in this chat");
        }

        const other = chat.participants.find((p) => p.userId !== senderId);
        if (other) {
            if (chat.context === LiveChatContext.MENTORSHIP) {
                await this.assertMentorshipLink(senderId, other.userId);
            } else if (chat.type === "INDIVIDUAL") {
                await this.friendRequestService.assertConnected(senderId, other.userId);
            }
        }

        const clientMessageId = dto.clientMessageId?.trim() || undefined;
        const messageInclude = {
            sender: {
                select: {
                    id: true,
                    email: true,
                    role: true,
                    isVerified: true,
                    profile: { select: { name: true, avatarUrl: true } },
                },
            },
            chat: {
                include: {
                    participants: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    role: true,
                                    isVerified: true,
                                    profile: { select: { name: true, avatarUrl: true } },
                                },
                            },
                        },
                    },
                },
            },
        } as const;

        if (clientMessageId) {
            const existing = await this.prisma.liveMessage.findFirst({
                where: { chatId, senderId, clientMessageId },
                include: messageInclude,
            });
            if (existing) return existing;
        }

        try {
            return await this.prisma.liveMessage.create({
                data: {
                    chatId,
                    senderId,
                    content: dto.content,
                    mediaUrl: dto.mediaUrl,
                    mediaType: dto.mediaType,
                    clientMessageId,
                },
                include: messageInclude,
            });
        } catch (err) {
            const code = (err as { code?: string })?.code;
            if (clientMessageId && code === "P2002") {
                const existing = await this.prisma.liveMessage.findFirst({
                    where: { chatId, senderId, clientMessageId },
                    include: messageInclude,
                });
                if (existing) return existing;
            }
            throw err;
        }
    }

    @HandleError("Failed to mark message as read", "message")
    async markRead(messageId: string, userId: string) {
        const message = await this.prisma.liveMessage.findUnique({
            where: { id: messageId },
            include: { chat: { include: { participants: true } } },
        });

        if (!message) {
            throw new NotFoundException("Message not found");
        }

        const isParticipant = message.chat.participants.some((p) => p.userId === userId);
        if (!isParticipant) {
            throw new ForbiddenException("You are not a participant in this chat");
        }

        return this.prisma.liveMessageRead.upsert({
            where: { messageId_userId: { messageId, userId } },
            create: {
                messageId,
                userId,
                liveChatId: message.chatId,
            },
            update: { readAt: new Date() },
        });
    }

    @HandleError("Failed to mark message delivered", "message")
    async markDelivered(messageId: string) {
        return this.prisma.liveMessage.updateMany({
            where: { id: messageId, status: LiveMessageStatus.SENT },
            data: { status: LiveMessageStatus.DELIVERED },
        });
    }

    @HandleError("Failed to get my chats", "chat")
    async getMyChats(userId: string, context?: LiveChatContext) {
        const chats = await this.prisma.liveChat.findMany({
            where: {
                type: "INDIVIDUAL",
                ...(context ? { context } : {}),
                participants: { some: { userId } },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                profile: { select: { name: true, avatarUrl: true } },
                            },
                        },
                    },
                },
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: {
                        sender: {
                            select: {
                                id: true,
                                profile: { select: { name: true, avatarUrl: true } },
                            },
                        },
                    },
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        return Promise.all(
            chats.map(async (chat) => {
                const unreadCount = await this.prisma.liveMessage.count({
                    where: {
                        chatId: chat.id,
                        senderId: { not: userId },
                        readBy: { none: { userId } },
                    },
                });

                const otherUser = chat.participants.find((p) => p.userId !== userId)?.user || null;

                return {
                    ...chat,
                    unreadCount,
                    otherUser,
                    lastMessage: chat.messages[0] || null,
                };
            }),
        );
    }

    @HandleError("Failed to get messages", "chat")
    async getMessages(chatId: string, userId: string, opts?: { cursor?: string; limit?: number }) {
        const chat = await this.prisma.liveChat.findUnique({
            where: { id: chatId },
            select: { id: true, participants: { select: { userId: true } } },
        });

        if (!chat) {
            throw new NotFoundException("Chat not found");
        }

        const isParticipant = chat.participants.some((p) => p.userId === userId);
        if (!isParticipant) {
            throw new ForbiddenException("You are not a participant in this chat");
        }

        const take = Math.min(Math.max(opts?.limit ?? 50, 1), 100);
        let cursorCreatedAt: Date | undefined;

        if (opts?.cursor) {
            const cursorMessage = await this.prisma.liveMessage.findUnique({
                where: { id: opts.cursor },
                select: { id: true, chatId: true, createdAt: true },
            });
            if (!cursorMessage || cursorMessage.chatId !== chatId) {
                throw new NotFoundException("Cursor message not found in this chat");
            }
            cursorCreatedAt = cursorMessage.createdAt;
        }

        const rows = await this.prisma.liveMessage.findMany({
            where: {
                chatId,
                ...(cursorCreatedAt ? { createdAt: { lt: cursorCreatedAt } } : {}),
            },
            orderBy: { createdAt: "desc" },
            take: take + 1,
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        profile: { select: { name: true, avatarUrl: true } },
                    },
                },
                readBy: {
                    select: {
                        userId: true,
                        readAt: true,
                    },
                },
            },
        });

        const hasMore = rows.length > take;
        const messages = hasMore ? rows.slice(0, take) : rows;
        const nextCursor = hasMore ? (messages[messages.length - 1]?.id ?? null) : null;

        return {
            messages,
            nextCursor,
            limit: take,
        };
    }

    @HandleError("Failed to get unread message count", "chat")
    async getUnreadCount(chatId: string, userId: string) {
        const count = await this.prisma.liveMessage.count({
            where: {
                chatId,
                senderId: { not: userId },
                readBy: { none: { userId } },
            },
        });

        return { chatId, unreadCount: count };
    }

    @HandleError("Failed to get or create private chat", "chat")
    async getOrCreatePrivateChatId(userId: string, otherUserId: string) {
        const chat = await this.getOrCreatePrivateChat(userId, otherUserId);
        return chat;
    }
}
