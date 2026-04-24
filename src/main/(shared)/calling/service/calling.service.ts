// src/call/service/call.service.ts

import { PrismaService } from "@lib/prisma/prisma.service";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cache } from "cache-manager";
import { CallGateway } from "../calling.gateway";
import { CallStatus } from "@prisma/client";

export interface Participant {
    socketId: string;
    userId: string;
    userName: string;
    hasVideo: boolean;
    hasAudio: boolean;
    joinedAt: Date;
}

export interface CallRoom {
    callId: string;
    hostUserId: string;
    recipientUserId: string;
    participants: Participant[];
    status: "CALLING" | "ACTIVE" | "ENDED" | "CANCELLED" | "MISSED" | "DECLINED";
    createdAt: Date;
    updatedAt: Date;
}

const END_STATUSES = new Set<CallStatus>([CallStatus.END, CallStatus.MISSED, CallStatus.DECLINED]);

@Injectable()
export class CallService {
    private readonly logger = new Logger(CallService.name);
    private readonly CALL_ROOM_PREFIX = "call_room:";
    private readonly USER_ROOM_PREFIX = "user_room:";
    private readonly USER_CALL_PREFIX = "user_call:";
    private readonly CACHE_TTL = 3600 * 24;

    constructor(
        private readonly prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

    /**
     * Start a one-to-one call
     */
    async startCallToUser(
        callerId: string,
        recipientUserId: string,
        socketId: string,
        callGateway: CallGateway,
    ): Promise<{ callId: string; status: "ringing" | "recipient_offline" | "user_busy" }> {
        if (callerId === recipientUserId) {
            throw new BadRequestException("Cannot call yourself");
        }

        // Check if caller is already in a call
        const callerActiveCall = await this.cacheManager.get(`${this.USER_CALL_PREFIX}${callerId}`);
        if (callerActiveCall) {
            throw new BadRequestException("You are already in a call");
        }

        // Check if recipient is already in a call
        const recipientActiveCall = await this.cacheManager.get(
            `${this.USER_CALL_PREFIX}${recipientUserId}`,
        );
        if (recipientActiveCall) {
            throw new BadRequestException("User is busy on another call");
        }

        // Get caller info for notification
        const caller = await this.prisma.user.findUnique({
            where: { id: callerId },
            select: {
                id: true,
                profile: {
                    select: { name: true, avatarUrl: true },
                },
            },
        });

        // Create call record in database
        const call = await this.prisma.calling.create({
            data: {
                hostUserId: callerId,
                status: "CALLING",
            },
        });

        // Create call room in cache WITH caller's socket ID
        const callRoom: CallRoom = {
            callId: call.id,
            hostUserId: callerId,
            recipientUserId: recipientUserId,
            participants: [
                {
                    userId: callerId,
                    socketId: socketId,
                    userName: caller?.profile?.name || "Unknown User",
                    hasVideo: false,
                    hasAudio: false,
                    joinedAt: new Date(),
                },
            ],
            status: "CALLING",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await this.cacheManager.set(`${this.CALL_ROOM_PREFIX}${call.id}`, callRoom, this.CACHE_TTL);

        // Mark both users as "in call" (pending)
        await this.cacheManager.set(`${this.USER_CALL_PREFIX}${callerId}`, call.id, this.CACHE_TTL);
        await this.cacheManager.set(
            `${this.USER_CALL_PREFIX}${recipientUserId}`,
            call.id,
            this.CACHE_TTL,
        );

        const recipientSockets = callGateway.getClientsForUser(recipientUserId);

        if (recipientSockets.size === 0) {
            // Recipient is offline - mark as missed
            await this.updateCallStatus(call.id, "MISSED");
            await this.cacheManager.del(`${this.USER_CALL_PREFIX}${callerId}`);
            await this.cacheManager.del(`${this.USER_CALL_PREFIX}${recipientUserId}`);
            return { callId: call.id, status: "recipient_offline" };
        }

        const payload = {
            callId: call.id,
            caller: {
                userId: callerId,
                socketId: socketId, // Include caller's socket ID
                name: caller?.profile?.name || "Unknown User",
                avatarUrl: caller?.profile?.avatarUrl || null,
            },
            timestamp: new Date().toISOString(),
        };

        // Send incoming call notification to all recipient devices
        recipientSockets.forEach((socket) => {
            socket.emit("incomingCall", payload);
        });

        this.logger.log(
            `Call initiated: ${callerId} → ${recipientUserId} (call: ${call.id}, socket: ${socketId})`,
        );

        return { callId: call.id, status: "ringing" };
    }

    /**
     * Accept a call
     */
    async acceptCall(callId: string, userId: string): Promise<CallRoom> {
        const cacheKey = `${this.CALL_ROOM_PREFIX}${callId}`;
        const room: CallRoom | undefined = await this.cacheManager.get(cacheKey);

        if (!room) {
            throw new NotFoundException("Call not found");
        }

        if (room.recipientUserId !== userId) {
            throw new BadRequestException("You are not the recipient of this call");
        }

        if (room.status !== "CALLING") {
            throw new BadRequestException(`Call is already ${room.status.toLowerCase()}`);
        }

        // Update call status to ACTIVE
        room.status = "ACTIVE";
        room.updatedAt = new Date();
        await this.cacheManager.set(cacheKey, room, this.CACHE_TTL);

        // Update database
        await this.prisma.calling.update({
            where: { id: callId },
            data: {
                status: "ACTIVE",
                startedAt: new Date(),
            },
        });

        this.logger.log(`Call ${callId} accepted by ${userId}`);

        return room;
    }

    /**
     * Decline a call
     */
    async declineCall(callId: string, userId: string): Promise<void> {
        const cacheKey = `${this.CALL_ROOM_PREFIX}${callId}`;
        const room: CallRoom | undefined = await this.cacheManager.get(cacheKey);

        if (!room) {
            throw new NotFoundException("Call not found");
        }

        if (room.recipientUserId !== userId) {
            throw new BadRequestException("You are not the recipient of this call");
        }

        // Update status
        await this.updateCallStatus(callId, "DECLINED");

        // Clean up cache
        await this.cacheManager.del(cacheKey);
        await this.cacheManager.del(`${this.USER_CALL_PREFIX}${room.hostUserId}`);
        await this.cacheManager.del(`${this.USER_CALL_PREFIX}${room.recipientUserId}`);

        this.logger.log(`Call ${callId} declined by ${userId}`);
    }

    /**
     * Cancel a call (by caller)
     */
    async cancelCall(callId: string, userId: string): Promise<void> {
        const cacheKey = `${this.CALL_ROOM_PREFIX}${callId}`;
        const room: CallRoom | undefined = await this.cacheManager.get(cacheKey);

        if (!room) {
            throw new NotFoundException("Call not found");
        }

        if (room.hostUserId !== userId) {
            throw new BadRequestException("Only the caller can cancel the call");
        }

        // Update status
        await this.updateCallStatus(callId, CallStatus.END);

        // Clean up cache
        await this.cacheManager.del(cacheKey);
        await this.cacheManager.del(`${this.USER_CALL_PREFIX}${room.hostUserId}`);
        await this.cacheManager.del(`${this.USER_CALL_PREFIX}${room.recipientUserId}`);

        this.logger.log(`Call ${callId} cancelled by ${userId}`);
    }

    /**
     * Join a call room (after acceptance)
     */
    async joinCall(
        callId: string,
        socketId: string,
        userId: string,
        userName: string,
        hasVideo: boolean,
        hasAudio: boolean,
    ): Promise<CallRoom> {
        const cacheKey = `${this.CALL_ROOM_PREFIX}${callId}`;
        const room: CallRoom | undefined = await this.cacheManager.get(cacheKey);

        if (!room) {
            throw new NotFoundException("Call room not found");
        }

        // Verify user is part of this call
        if (room.hostUserId !== userId && room.recipientUserId !== userId) {
            throw new BadRequestException("You are not part of this call");
        }

        // Remove existing participant with same socketId (reconnection)
        room.participants = room.participants.filter((p) => p.socketId !== socketId);

        // Add participant
        const participant: Participant = {
            socketId,
            userId,
            userName,
            hasVideo,
            hasAudio,
            joinedAt: new Date(),
        };

        room.participants.push(participant);
        room.updatedAt = new Date();

        // Save to cache
        await this.cacheManager.set(cacheKey, room, this.CACHE_TTL);
        await this.cacheManager.set(`${this.USER_ROOM_PREFIX}${socketId}`, callId, this.CACHE_TTL);

        // Create participant record in database
        try {
            const existingParticipant = await this.prisma.callParticipant.findFirst({
                where: { callId, socketId, leftAt: null },
            });

            if (!existingParticipant) {
                await this.prisma.callParticipant.create({
                    data: {
                        callId,
                        socketId,
                        userName,
                        hasVideo,
                        hasAudio,
                    },
                });
            }
        } catch (dbError) {
            this.logger.warn(`Failed to create participant record: ${dbError.message}`);
        }

        this.logger.log(
            `User ${userId} (${socketId}) joined call ${callId}. Total: ${room.participants.length}`,
        );

        return room;
    }

    /**
     * Leave a call
     */
    async leaveCall(socketId: string, userId: string, callId: string): Promise<CallRoom | null> {
        const cacheKey = `${this.CALL_ROOM_PREFIX}${callId}`;
        const room: CallRoom | undefined = await this.cacheManager.get(cacheKey);

        if (!room) {
            this.logger.warn(`Room ${callId} not found`);
            return null;
        }

        // Remove participant
        room.participants = room.participants.filter((p) => p.socketId !== socketId);
        room.updatedAt = new Date();

        // Update cache
        if (room.participants.length > 0) {
            await this.cacheManager.set(cacheKey, room, this.CACHE_TTL);
        } else {
            // No participants left - end the call
            await this.endCall(callId);
        }

        // Clear mappings
        await this.cacheManager.del(`${this.USER_ROOM_PREFIX}${socketId}`);
        await this.cacheManager.del(`${this.USER_CALL_PREFIX}${userId}`);

        // Update database
        try {
            await this.prisma.callParticipant.updateMany({
                where: { callId, socketId, leftAt: null },
                data: { leftAt: new Date() },
            });
        } catch (dbError) {
            this.logger.warn(`Failed to update participant leave time: ${dbError.message}`);
        }

        this.logger.log(
            `User ${socketId} left call ${callId}. Remaining: ${room.participants.length}`,
        );

        return room;
    }

    /**
     * Update media state
     */
    async updateMediaState(
        socketId: string,
        callId: string,
        mediaType: "video" | "audio",
        enabled: boolean,
    ): Promise<void> {
        const cacheKey = `${this.CALL_ROOM_PREFIX}${callId}`;
        const room: CallRoom | undefined = await this.cacheManager.get(cacheKey);

        if (!room) {
            this.logger.warn(`Room ${callId} not found`);
            return;
        }

        const participant = room.participants.find((p) => p.socketId === socketId);
        if (!participant) {
            this.logger.warn(`Participant ${socketId} not found`);
            return;
        }

        if (mediaType === "video") {
            participant.hasVideo = enabled;
        } else {
            participant.hasAudio = enabled;
        }

        room.updatedAt = new Date();
        await this.cacheManager.set(cacheKey, room, this.CACHE_TTL);

        this.logger.debug(`Updated ${mediaType} to ${enabled} for ${socketId}`);
    }

    /**
     * End a call
     */
    async endCall(callId: string): Promise<void> {
        const cacheKey = `${this.CALL_ROOM_PREFIX}${callId}`;
        const room: CallRoom | undefined = await this.cacheManager.get(cacheKey);

        // Clean up cache
        await this.cacheManager.del(cacheKey);

        if (room) {
            await this.cacheManager.del(`${this.USER_CALL_PREFIX}${room.hostUserId}`);
            await this.cacheManager.del(`${this.USER_CALL_PREFIX}${room.recipientUserId}`);

            // Clean up participant mappings
            for (const participant of room.participants) {
                await this.cacheManager.del(`${this.USER_ROOM_PREFIX}${participant.socketId}`);
            }
        }

        // Update database
        await this.updateCallStatus(callId, "END");

        this.logger.log(`Call ${callId} ended`);
    }

    /**
     * Update call status in database
     */

    async updateCallStatus(callId: string, status: CallStatus): Promise<void> {
        try {
            const shouldEndCall = END_STATUSES.has(status);

            await this.prisma.calling.update({
                where: { id: callId },
                data: {
                    status,
                    ...(shouldEndCall && { endedAt: new Date() }),
                },
            });
        } catch (error) {
            this.logger.error(`Failed to update call status: ${error.message}`);
        }
    }
    /**
     * Get call room
     */
    async getCallRoom(callId: string): Promise<CallRoom | null> {
        try {
            const cacheKey = `${this.CALL_ROOM_PREFIX}${callId}`;
            const result = await this.cacheManager.get(cacheKey);
            return result ? (result as CallRoom) : null;
        } catch (error) {
            this.logger.error(`Error getting call room: ${error.message}`);
            return null;
        }
    }

    /**
     * Get user's current call
     */
    async getUserCurrentCall(userId: string): Promise<string | null> {
        try {
            const result = await this.cacheManager.get(`${this.USER_CALL_PREFIX}${userId}`);
            return typeof result === "string" ? result : null;
        } catch (error) {
            this.logger.error(`Error getting user call: ${error.message}`);
            return null;
        }
    }

    /**
     * Get call by ID
     */
    async getCallById(callId: string): Promise<any> {
        try {
            const call = await this.prisma.calling.findUnique({
                where: { id: callId },
                include: {
                    host: {
                        select: {
                            id: true,
                            email: true,
                            profile: { select: { name: true, avatarUrl: true } },
                        },
                    },
                    participants: {
                        where: { leftAt: null },
                    },
                },
            });

            if (call) {
                const cachedRoom = await this.getCallRoom(callId);
                if (cachedRoom) {
                    (call as any).activeParticipants = cachedRoom.participants;
                }
            }

            return call;
        } catch (error) {
            this.logger.error(`Error getting call: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get call history
     */
    async getCallHistory(userId: string, limit = 50): Promise<any[]> {
        try {
            return await this.prisma.calling.findMany({
                where: {
                    hostUserId: userId,
                },
                include: {
                    host: {
                        select: {
                            id: true,
                            email: true,
                            profile: { select: { name: true, avatarUrl: true } },
                        },
                    },
                    participants: {
                        orderBy: { joinedAt: "desc" },
                    },
                },
                orderBy: { createdAt: "desc" },
                take: limit,
            });
        } catch (error) {
            this.logger.error(`Error getting call history: ${error.message}`);
            throw error;
        }
    }
}
