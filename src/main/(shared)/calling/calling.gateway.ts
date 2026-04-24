// src/call/calling.gateway.ts
import { CallingPayloadForSocketClient } from "@common/interface/calling-payload";
import { JWTPayload } from "@common/jwt/jwt.interface";
import { PrismaService } from "@lib/prisma/prisma.service";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { IceCandidateDto, JoinCallDto, WebRTCSignalDto } from "./dto/calling.dto";
import { CallService } from "./service/calling.service";

@WebSocketGateway({
    cors: { origin: "*", credentials: true },
    namespace: "/calling",
    pingInterval: 25000,
    pingTimeout: 20000,
    connectTimeout: 45000,
    allowEIO3: true,
})
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(CallGateway.name);
    private readonly clients = new Map<string, Set<Socket>>();
    private readonly socketToUserId = new Map<string, string>();
    private readonly pendingAuthentication = new Set<string>();

    constructor(
        private readonly callService: CallService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {}

    @WebSocketServer()
    server: Server;

    afterInit(server: Server) {
        this.logger.log(`Socket.IO server initialized: ${server.adapter.name}`);
    }

    async handleConnection(client: Socket) {
        this.logger.log(`Client connecting: ${client.id}`);
        this.pendingAuthentication.add(client.id);

        const token = this.extractTokenFromSocket(client);
        if (token) {
            await this.authenticateClient(client, token);
        } else {
            setTimeout(() => {
                if (this.pendingAuthentication.has(client.id)) {
                    this.logger.warn(`Auth timeout: ${client.id}`);
                    client.emit("authError", { message: "Authentication timeout" });
                    client.disconnect(true);
                }
            }, 10000);
        }
    }

    @SubscribeMessage("authenticate")
    async handleAuthenticate(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { token: string },
    ) {
        if (!this.pendingAuthentication.has(client.id)) {
            return { success: true };
        }
        await this.authenticateClient(client, data.token);
        return { success: true };
    }

    private async authenticateClient(client: Socket, token: string) {
        try {
            if (!token) {
                client.emit("authError", { message: "No token" });
                client.disconnect(true);
                return;
            }

            const payload = this.jwtService.verify<JWTPayload>(token, {
                secret: this.configService.getOrThrow("JWT_SECRET"),
            });

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                select: { id: true, email: true, profile: { select: { name: true } } },
            });

            if (!user) {
                client.emit("authError", { message: "User not found" });
                client.disconnect(true);
                return;
            }

            const payloadForSocketClient: CallingPayloadForSocketClient = {
                sub: user.id,
                email: user.email,
            };

            client.data.user = payloadForSocketClient;
            client.data.userName = user.profile?.name || user.email;
            this.subscribeClient(user.id, client);
            this.socketToUserId.set(client.id, user.id);
            this.pendingAuthentication.delete(client.id);

            client.emit("authenticated", {
                socketId: client.id,
                userId: user.id,
            });

            this.logger.log(`Authenticated: ${user.id} (${client.id})`);
        } catch (err: any) {
            this.logger.warn(`Auth failed for ${client.id}: ${err.message}`);
            client.emit("authError", { message: "Authentication failed" });
            client.disconnect(true);
        }
    }

    async handleDisconnect(client: Socket) {
        const userId = client.data?.user?.sub;
        this.pendingAuthentication.delete(client.id);

        if (userId) {
            // Handle call cleanup
            const currentCall = await this.callService.getUserCurrentCall(userId);
            if (currentCall) {
                await this.handleUserLeavingCall(client, userId, currentCall);
            }

            this.unsubscribeClient(userId, client);
            this.socketToUserId.delete(client.id);
            this.logger.log(`Disconnected: ${userId} (${client.id})`);
        }
    }

    private extractTokenFromSocket(client: Socket): string | null {
        const authHeader = client.handshake.headers.authorization;
        const authToken = client.handshake.auth?.token;
        const queryToken = client.handshake.query?.token as string;

        if (authHeader) {
            return authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
        }
        return authToken || queryToken || null;
    }

    private subscribeClient(userId: string, client: Socket) {
        if (!this.clients.has(userId)) {
            this.clients.set(userId, new Set());
        }
        this.clients.get(userId)!.add(client);
    }

    public getClientsForUser(userId: string): Set<Socket> {
        return this.clients.get(userId) || new Set();
    }

    private unsubscribeClient(userId: string, client: Socket) {
        const set = this.clients.get(userId);
        if (!set) return;
        set.delete(client);
        if (set.size === 0) {
            this.clients.delete(userId);
        }
    }

    private requireAuth(client: Socket): boolean {
        if (!client.data?.user?.sub) {
            client.emit("error", { message: "Not authenticated" });
            return false;
        }
        return true;
    }

    // ==================== CALL CONTROL EVENTS ====================

    // @SubscribeMessage("acceptCall")
    // async handleAcceptCall(
    //     @ConnectedSocket() recipientSocket: Socket,
    //     @MessageBody() payload: { callId: string },
    // ) {
    //     if (!this.requireAuth(recipientSocket)) return;

    //     if (!payload?.callId) {
    //         return recipientSocket.emit("error", {
    //             message: "callId is required",
    //             event: "acceptCall",
    //         });
    //     }

    //     const recipientUserId = recipientSocket.data.user.sub;
    //     const recipientName = recipientSocket.data.userName || "Unknown";
    //     const recipientSocketId = recipientSocket.id;

    //     try {
    //         // Accept the call through service
    //         const callRoom = await this.callService.acceptCall(payload.callId, recipientUserId);

    //         // Join the recipient to the call in DB
    //         await this.callService.joinCall(
    //             payload.callId,
    //             recipientSocketId,
    //             recipientUserId,
    //             recipientName,
    //             true,
    //             true,
    //         );

    //         // Get recipient info
    //         const recipientInfo = await this.prisma.user.findUnique({
    //             where: { id: recipientUserId },
    //             select: {
    //                 id: true,
    //                 profile: { select: { name: true, avatarUrl: true } },
    //             },
    //         });

    //         // Find caller's socket ID from participants
    //         const callerParticipant = callRoom.participants.find(
    //             (p) => p.userId === callRoom.hostUserId,
    //         );
    //         const callerSocketId = callerParticipant?.socketId;

    //         // Notify caller that call was accepted
    //         const callerUserId = callRoom.hostUserId;
    //         const callerSockets = this.getClientsForUser(callerUserId);

    //         callerSockets.forEach((socket) => {
    //             socket.emit("callAccepted", {
    //                 callId: payload.callId,
    //                 acceptedBy: recipientUserId,
    //                 recipientSocketId: recipientSocketId, // Recipient's socket ID
    //                 recipient: {
    //                     userId: recipientUserId,
    //                     name: recipientInfo?.profile?.name || recipientName,
    //                     avatarUrl: recipientInfo?.profile?.avatarUrl || null,
    //                 },
    //             });
    //         });

    //         // Confirm to recipient with caller's socket ID
    //         recipientSocket.emit("callJoined", {
    //             callId: payload.callId,
    //             status: "ACTIVE",
    //             yourSocketId: recipientSocketId,
    //             callerSocketId: callerSocketId, // Send caller's socket ID to recipient
    //         });

    //         this.logger.log(
    //             `Call ${payload.callId} accepted by ${recipientUserId} (socket: ${recipientSocketId})`,
    //         );
    //     } catch (error) {
    //         this.logger.error(`Error accepting call: ${error.message}`);
    //         recipientSocket.emit("error", {
    //             message: "Failed to accept call",
    //             details: error.message,
    //         });
    //     }
    // }

    @SubscribeMessage("declineCall")
    async handleDeclineCall(
        @ConnectedSocket() socket: Socket,
        @MessageBody() data: { callId: string },
    ) {
        if (!this.requireAuth(socket)) return;

        try {
            const userId = socket.data.user.sub;
            const room = await this.callService.getCallRoom(data.callId);

            if (room) {
                await this.callService.declineCall(data.callId, userId);

                // Notify caller
                const callerSockets = this.getClientsForUser(room.hostUserId);
                callerSockets.forEach((s) => {
                    s.emit("callDeclined", {
                        callId: data.callId,
                        declinedBy: userId,
                    });
                });

                this.logger.log(`Call ${data.callId} declined by ${userId}`);
            }
        } catch (error) {
            this.logger.error(`Error declining call: ${error.message}`);
            socket.emit("error", { message: error.message });
        }
    }

    @SubscribeMessage("cancelCall")
    async handleCancelCall(
        @ConnectedSocket() socket: Socket,
        @MessageBody() data: { callId: string },
    ) {
        if (!this.requireAuth(socket)) return;

        try {
            const userId = socket.data.user.sub;
            const room = await this.callService.getCallRoom(data.callId);

            if (room) {
                await this.callService.cancelCall(data.callId, userId);

                // Notify recipient
                const recipientSockets = this.getClientsForUser(room.recipientUserId);
                recipientSockets.forEach((s) => {
                    s.emit("callCancelled", {
                        callId: data.callId,
                        cancelledBy: userId,
                    });
                });

                this.logger.log(`Call ${data.callId} cancelled by ${userId}`);
            }
        } catch (error) {
            this.logger.error(`Error cancelling call: ${error.message}`);
            socket.emit("error", { message: error.message });
        }
    }

    @SubscribeMessage("joinCall")
    async handleJoinCall(@ConnectedSocket() socket: Socket, @MessageBody() data: JoinCallDto) {
        if (!this.requireAuth(socket)) return;

        try {
            const { callId, hasVideo, hasAudio } = data;
            const userId = socket.data.user.sub;
            const userName = socket.data.userName || data.userName;

            this.logger.log(`User ${userId} joining call ${callId}`);

            const call = await this.callService.getCallById(callId);
            if (!call || ["ENDED", "CANCELLED", "DECLINED"].includes(call.status)) {
                return socket.emit("error", { message: "Call not available" });
            }

            // Join socket room
            socket.join(callId);

            // Add to call room
            const room = await this.callService.joinCall(
                callId,
                socket.id,
                userId,
                userName,
                hasVideo ?? true,
                hasAudio ?? true,
            );

            // Get other participant
            const otherParticipants = room.participants.filter((p) => p.socketId !== socket.id);

            // Notify others
            socket.to(callId).emit("userJoined", {
                socketId: socket.id,
                userId,
                userName,
                hasVideo,
                hasAudio,
            });

            // Send room info to joining user
            socket.emit("joinedCall", {
                callId,
                userId,
                socketId: socket.id,
                participants: otherParticipants,
            });

            this.logger.log(`User ${userId} joined call ${callId}`);
        } catch (error) {
            this.logger.error(`Error joining call: ${error.message}`);
            socket.emit("error", { message: error.message });
        }
    }

    @SubscribeMessage("leaveCall")
    async handleLeaveCall(
        @ConnectedSocket() socket: Socket,
        @MessageBody() data: { callId: string },
    ) {
        if (!this.requireAuth(socket)) return;
        const userId = socket.data.user.sub;
        await this.handleUserLeavingCall(socket, userId, data.callId);
    }

    private async handleUserLeavingCall(socket: Socket, userId: string, callId: string) {
        try {
            this.logger.log(`User ${userId} leaving call ${callId}`);

            socket.leave(callId);
            const room = await this.callService.leaveCall(socket.id, userId, callId);

            // Notify others
            socket.to(callId).emit("participantLeft", { socketId: socket.id, userId });

            // End call if no one left
            if (room?.participants.length === 0) {
                await this.callService.endCall(callId);
                this.logger.log(`Call ${callId} ended (empty)`);
            }
        } catch (error) {
            this.logger.error(`Error leaving call: ${error.message}`);
        }
    }

    // ==================== MEDIA CONTROL ====================

    @SubscribeMessage("toggleVideo")
    async handleToggleVideo(
        @ConnectedSocket() socket: Socket,
        @MessageBody() data: { callId: string; enabled: boolean },
    ) {
        if (!this.requireAuth(socket)) return;

        try {
            await this.callService.updateMediaState(socket.id, data.callId, "video", data.enabled);
            socket.to(data.callId).emit("participantVideoToggled", {
                socketId: socket.id,
                enabled: data.enabled,
            });
        } catch (error) {
            this.logger.error(`Error toggling video: ${error.message}`);
        }
    }

    @SubscribeMessage("toggleAudio")
    async handleToggleAudio(
        @ConnectedSocket() socket: Socket,
        @MessageBody() data: { callId: string; enabled: boolean },
    ) {
        if (!this.requireAuth(socket)) return;

        try {
            await this.callService.updateMediaState(socket.id, data.callId, "audio", data.enabled);
            socket.to(data.callId).emit("participantAudioToggled", {
                socketId: socket.id,
                enabled: data.enabled,
            });
        } catch (error) {
            this.logger.error(`Error toggling audio: ${error.message}`);
        }
    }

    // ==================== WEBRTC SIGNALING ====================

    @SubscribeMessage("offer")
    handleOffer(@ConnectedSocket() socket: Socket, @MessageBody() data: WebRTCSignalDto) {
        if (!this.requireAuth(socket)) return;

        const targetSocket = this.server.sockets.sockets.get(data.targetSocketId);
        if (!targetSocket) {
            this.logger.warn(`Target socket ${data.targetSocketId} not found`);
            return socket.emit("error", { message: "Peer not found" });
        }

        this.logger.debug(`Relaying offer: ${socket.id} → ${data.targetSocketId}`);
        targetSocket.emit("offer", {
            offer: data.signal,
            senderId: socket.id,
        });
    }

    @SubscribeMessage("answer")
    handleAnswer(@ConnectedSocket() socket: Socket, @MessageBody() data: WebRTCSignalDto) {
        if (!this.requireAuth(socket)) return;

        const targetSocket = this.server.sockets.sockets.get(data.targetSocketId);
        if (!targetSocket) {
            this.logger.warn(`Target socket ${data.targetSocketId} not found`);
            return socket.emit("error", { message: "Peer not found" });
        }

        this.logger.debug(`Relaying answer: ${socket.id} → ${data.targetSocketId}`);
        targetSocket.emit("answer", {
            answer: data.signal,
            senderId: socket.id,
        });
    }

    @SubscribeMessage("iceCandidate")
    handleIceCandidate(@ConnectedSocket() socket: Socket, @MessageBody() data: IceCandidateDto) {
        if (!this.requireAuth(socket)) return;

        const targetSocket = this.server.sockets.sockets.get(data.targetSocketId);
        if (!targetSocket) {
            return;
        }

        this.logger.debug(`Relaying ICE: ${socket.id} → ${data.targetSocketId}`);
        targetSocket.emit("iceCandidate", {
            candidate: data.candidate,
            senderId: socket.id,
        });
    }

    // ----------------- send call buy user id socket io -------------------

    @SubscribeMessage("callUser")
    async handleDirectCallUser(
        @ConnectedSocket() callerSocket: Socket,
        @MessageBody() payload: { userId: string },
    ) {
        if (!this.requireAuth(callerSocket)) return;

        if (!payload?.userId) {
            return callerSocket.emit("error", { message: "userId is required" });
        }

        const callerId = callerSocket.data.user.sub;
        const callerName = callerSocket.data.userName || "Unknown";
        const callerSocketId = callerSocket.id;

        if (callerId === payload.userId) {
            return callerSocket.emit("error", { message: "Cannot call yourself" });
        }

        try {
            // Get recipient's socket IDs (if online)
            const recipientSockets = this.getClientsForUser(payload.userId);
            const recipientSocketId =
                recipientSockets.size > 0 ? Array.from(recipientSockets)[0].id : null;

            // Start the call
            const result = await this.callService.startCallToUser(
                callerId,
                payload.userId,
                callerSocketId,
                this,
            );

            const callId = result.callId;

            // Get caller info
            const callerInfo = await this.prisma.user.findUnique({
                where: { id: callerId },
                select: {
                    id: true,
                    email: true,
                    profile: { select: { name: true, avatarUrl: true } },
                },
            });

            // Auto-join caller to the call
            callerSocket.join(callId);
            await this.callService.joinCall(
                callId,
                callerSocketId,
                callerId,
                callerInfo?.profile?.name || callerName,
                true,
                true,
            );

            // Send success to caller with BOTH socket IDs
            callerSocket.emit("callStarted", {
                callId,
                status: result.status,
                recipientUserId: payload.userId,
                callerSocketId: callerSocketId,
                recipientSocketId: recipientSocketId,
            });

            // If recipient is offline, notify caller immediately
            if (result.status === "recipient_offline") {
                callerSocket.emit("callMissed", {
                    callId,
                    reason: "recipient_offline",
                });

                this.logger.log(`Call ${callId} failed: Recipient ${payload.userId} is offline`);
                return;
            }

            // Recipient is online - send incoming call notification
            const incomingCallPayload = {
                callId,
                caller: {
                    userId: callerId,
                    name: callerInfo?.profile?.name || callerName,
                    avatarUrl: callerInfo?.profile?.avatarUrl || null,
                    socketId: callerSocketId,
                },
                recipientSocketId: recipientSocketId,
                timestamp: new Date().toISOString(),
            };

            // Send to all recipient's devices
            recipientSockets.forEach((socket) => {
                socket.emit("incomingCall", incomingCallPayload);
            });

            this.logger.log(
                `Call initiated: ${callerInfo?.profile?.name || callerName} (${callerId}) ` +
                    `[socket: ${callerSocketId}] → ${payload.userId} [socket: ${recipientSocketId}] ` +
                    `| callId: ${callId} | status: ${result.status}`,
            );
        } catch (error) {
            this.logger.error(`Error starting call: ${error.message}`);
            callerSocket.emit("error", {
                message: error.message || "Failed to start call",
            });
        }
    }

    // -----------------accept call by user id socket io -------------------

    @SubscribeMessage("acceptCall")
    async handleAcceptCall(
        @ConnectedSocket() recipientSocket: Socket,
        @MessageBody() payload: { callId: string },
    ) {
        if (!this.requireAuth(recipientSocket)) return;

        if (!payload?.callId) {
            return recipientSocket.emit("error", {
                message: "callId is required",
                event: "acceptCall",
            });
        }

        const recipientUserId = recipientSocket.data.user.sub;
        const recipientName = recipientSocket.data.userName || "Unknown";
        const recipientSocketId = recipientSocket.id;

        try {
            // Accept the call through service
            const callRoom = await this.callService.acceptCall(payload.callId, recipientUserId);

            // Find caller's socket ID from participants (caller joined when initiating call)
            const callerParticipant = callRoom.participants.find(
                (p) => p.userId === callRoom.hostUserId,
            );
            const callerSocketId = callerParticipant?.socketId;

            if (!callerSocketId) {
                this.logger.error(`Caller socket ID not found for call ${payload.callId}`);
                return recipientSocket.emit("error", {
                    message: "Caller is no longer available",
                });
            }

            // Join recipient socket to the room
            recipientSocket.join(payload.callId);

            // Add recipient to call participants
            await this.callService.joinCall(
                payload.callId,
                recipientSocketId,
                recipientUserId,
                recipientName,
                true,
                true,
            );

            // Get recipient info
            const recipientInfo = await this.prisma.user.findUnique({
                where: { id: recipientUserId },
                select: {
                    id: true,
                    profile: { select: { name: true, avatarUrl: true } },
                },
            });

            // Notify caller that call was accepted - send BOTH socket IDs
            const callerSockets = this.getClientsForUser(callRoom.hostUserId);
            const callAcceptedPayload = {
                callId: payload.callId,
                acceptedBy: recipientUserId,
                callerSocketId: callerSocketId, // Caller's own socket ID
                recipientSocketId: recipientSocketId, // Recipient's socket ID
                recipient: {
                    userId: recipientUserId,
                    name: recipientInfo?.profile?.name || recipientName,
                    avatarUrl: recipientInfo?.profile?.avatarUrl || null,
                },
            };

            callerSockets.forEach((socket) => {
                socket.emit("callAccepted", callAcceptedPayload);
            });

            // Confirm to recipient with BOTH socket IDs
            recipientSocket.emit("callJoined", {
                callId: payload.callId,
                status: "ACTIVE",
                recipientSocketId: recipientSocketId, // Your socket ID
                callerSocketId: callerSocketId, // Caller's socket ID
                caller: {
                    userId: callRoom.hostUserId,
                },
            });

            this.logger.log(
                `Call ${payload.callId} accepted: ` +
                    `Recipient ${recipientUserId} [socket: ${recipientSocketId}] ` +
                    `← Caller ${callRoom.hostUserId} [socket: ${callerSocketId}]`,
            );
        } catch (error) {
            this.logger.error(`Error accepting call ${payload.callId}: ${error.message}`);
            recipientSocket.emit("error", {
                message: "Failed to accept call",
                details: error.message,
            });
        }
    }
}
