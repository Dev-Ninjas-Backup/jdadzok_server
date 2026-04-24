import { EVENT_TYPES } from "@common/interface/events-name";
import {
    CapLevelEvent,
    Community,
    Custom,
    Ngo,
    Notification,
    PostEvent,
} from "@common/interface/events-payload";
import { PayloadForSocketClient } from "@common/interface/socket-client-payload";
import { JWTPayload } from "@common/jwt/jwt.interface";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";
import { JwtService } from "@nestjs/jwt";
import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";
import { NotificationType } from "@prisma/client";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";

@WebSocketGateway({
    cors: { origin: "*" },
    namespace: "/js/notification",
})
@Injectable()
export class NotificationGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    private readonly logger = new Logger(NotificationGateway.name);
    private readonly clients = new Map<string, Set<Socket>>();
    private userSockets = new Map<string, string>();

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {}

    @WebSocketServer()
    server: Server;

    afterInit(server: Server) {
        this.logger.log(
            "Socket.IO server initialized for Notification Gateway",
            server.adapter.name,
        );
    }

    async handleConnection(client: Socket) {
        try {
            const token = this.extractTokenFromSocket(client);
            if (!token) return client.disconnect(true);

            const payload = this.jwtService.verify<JWTPayload>(token, {
                secret: this.configService.getOrThrow("JWT_SECRET"),
            });

            if (!payload.sub) return client.disconnect(true);

            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
                select: {
                    id: true,
                    email: true,
                    NotificationToggle: true,
                },
            });

            if (!user) return client.disconnect(true);

            // Create notification toggle if it doesn't exist
            if (!user.NotificationToggle?.length) {
                await this.prisma.notificationToggle.create({
                    data: { userId: user.id },
                });
                user.NotificationToggle = await this.prisma.notificationToggle.findMany({
                    where: { userId: user.id },
                });
            }

            const payloadForSocketClient: PayloadForSocketClient = {
                sub: user.id,
                email: user.email,
                emailToggle: user.NotificationToggle?.[0]?.email || false,
                userUpdates: user.NotificationToggle?.[0]?.userUpdates || false,
                communication: user.NotificationToggle?.[0]?.communication || false,
                community: user.NotificationToggle?.[0]?.community || false,
                comment: user.NotificationToggle?.[0]?.comment || false,
                post: user.NotificationToggle?.[0]?.post || false,
                message: user.NotificationToggle?.[0]?.message || false,
                ngo: user.NotificationToggle?.[0]?.ngo ?? true,
                userRegistration: user.NotificationToggle?.[0]?.userRegistration || false,
                Custom: user.NotificationToggle?.[0]?.Custom || false,
                capLevel: user.NotificationToggle?.[0]?.capLevel || false,
            };

            client.data.user = payloadForSocketClient;
            this.subscribeClient(user.id, client);

            this.logger.log(`Client connected: ${user.id}`);
        } catch (err: any) {
            this.logger.warn(`JWT verification failed: ${err.message}`);
            client.disconnect(true);
        }
    }

    handleDisconnect(client: Socket) {
        const userId = client.data?.user?.sub;
        if (userId) {
            this.unsubscribeClient(userId, client);
            this.logger.log(`Client disconnected: ${userId}`);
        } else {
            this.logger.log("Client disconnected: unknown user");
        }
    }

    private extractTokenFromSocket(client: Socket): string | null {
        const authHeader = client.handshake.headers.authorization || client.handshake.auth?.token;
        if (!authHeader) return null;
        return authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    }

    private subscribeClient(userId: string, client: Socket) {
        if (!this.clients.has(userId)) {
            this.clients.set(userId, new Set());
        }
        this.clients.get(userId)!.add(client);
        this.logger.debug(`Subscribed client to user ${userId}`);
    }

    private unsubscribeClient(userId: string, client: Socket) {
        const set = this.clients.get(userId);
        if (!set) return;

        set.delete(client);
        this.logger.debug(`Unsubscribed client from user ${userId}`);
        if (set.size === 0) {
            this.clients.delete(userId);
            this.logger.debug(`Removed empty client set for user ${userId}`);
        }
    }

    public getClientsForUser(userId: string): Set<Socket> {
        return this.clients.get(userId) || new Set();
    }

    public getDelay(publishAt: Date): number {
        const delay = publishAt.getTime() - Date.now();
        return delay > 0 ? delay : 0;
    }

    public async notifySingleUser(
        userId: string,
        event: string,
        data: Notification,
    ): Promise<void> {
        const clients = this.getClientsForUser(userId);
        if (clients.size === 0) {
            this.logger.warn(`No clients connected for user ${userId}`);
            return;
        }

        clients.forEach((client) => {
            client.emit(event, data);
            this.logger.log(`Notification sent to user ${userId} via event ${event}`);
        });
    }

    public async notifyMultipleUsers(
        userIds: string[],
        event: string,
        data: Notification,
    ): Promise<void> {
        if (userIds.length === 0) {
            this.logger.warn("No user IDs provided for notification");
            return;
        }

        userIds.forEach((userId) => {
            this.notifySingleUser(userId, event, data);
        });
    }

    public async notifyAllUsers(event: string, data: Notification): Promise<void> {
        this.clients.forEach((clients, userId) => {
            clients.forEach((client) => {
                client.emit(event, data);
                this.logger.log(
                    `Notification sent to all users via event ${event} for user ${userId}`,
                );
            });
        });
    }

    @SubscribeMessage("ping")
    handlePing(client: Socket) {
        this.logger.debug("Received ping from client");
        client.emit("pong");
    }

    @SubscribeMessage("Community_CREATE")
    handlePong(client: Socket) {
        this.logger.debug("Received pong from client");
        client.emit("Community_CREATE");
    }

    @SubscribeMessage(EVENT_TYPES.COMMENT_CREATE)
    handleSomething(purpose: string, client: Socket) {
        client.broadcast.emit(purpose, {});
    }

    // ==================== HELPER METHOD: Save Notifications to Database ====================
    private async saveNotificationToDatabase(
        recipients: { id: string; email: string }[],
        type: NotificationType,
        title: string,
        message: string,
        entityId: string | null,
        metadata: any,
    ): Promise<void> {
        try {
            // Create notification and UserNotification for each recipient
            const notificationPromises = recipients.map(async (recipient) => {
                // Create the notification
                const notification = await this.prisma.notification.create({
                    data: {
                        userId: recipient.id,
                        type: type,
                        title: title,
                        message: message,
                        entityId: entityId,
                        read: false,
                        metadata: metadata,
                    },
                });

                // Create UserNotification entry
                await this.prisma.userNotification.create({
                    data: {
                        userId: recipient.id,
                        notificationId: notification.id,
                        read: false,
                    },
                });

                this.logger.log(
                    `✓ Saved notification to DB for user ${recipient.id} (${recipient.email})`,
                );

                return notification;
            });

            await Promise.all(notificationPromises);
            this.logger.log(`✓ All notifications saved to database for ${recipients.length} users`);
        } catch (error) {
            this.logger.error(`Failed to save notifications to database: ${error}`);
            throw error;
        }
    }

    // ==================== COMMUNITY CREATE ====================
    @OnEvent(EVENT_TYPES.COMMUNITY_CREATE)
    async handlCommnityCreated(payload: Community) {
        this.logger.log("COMMUNITY_CREATE EVENT RECEIVED");
        this.logger.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

        if (!payload.info?.recipients?.length) {
            this.logger.warn("No recipients in payload → skipping");
            return;
        }

        this.logger.log(`Found ${payload.info.recipients.length} recipient(s)`);

        // 1. SAVE TO DATABASE FIRST
        await this.saveNotificationToDatabase(
            payload.info.recipients,
            NotificationType.CAP_UPGRADE,
            payload.info.title,
            payload.info.message,
            payload.meta?.communityId || null,
            payload.meta,
        );

        // 2. SEND REAL-TIME NOTIFICATIONS VIA WEBSOCKET
        for (const r of payload.info.recipients) {
            this.logger.log(`--- Processing recipient: ${r.id} (${r.email}) ---`);

            const clients = this.getClientsForUser(r.id);
            this.logger.log(`  → Total connected sockets for this user: ${clients.size}`);

            if (clients.size === 0) {
                this.logger.warn(`  No active socket for user ${r.id} → notification NOT sent`);
                continue;
            }

            const client = Array.from(clients).find((c) => c.data.user?.community === true);

            if (!client) {
                this.logger.warn(
                    `  User ${r.id} has socket but community toggle = false or missing`,
                );
                continue;
            }

            this.logger.log(`  Sending notification to socket ${client.id}`);

            client.emit(EVENT_TYPES.COMMUNITY_CREATE, {
                type: EVENT_TYPES.COMMUNITY_CREATE,
                title: payload.info.title,
                message: payload.info.message,
                createdAt: new Date(),
                meta: payload.meta,
            } satisfies Notification);

            this.logger.log(`EMIT SUCCESS → COMMUNITY_CREATE sent to user ${r.id}`);
        }

        this.logger.log("COMMUNITY_CREATE processing complete");
    }

    // ==================== NGO CREATE ====================
    @OnEvent(EVENT_TYPES.NGO_CREATE)
    async handleNgoCreated(payload: Ngo) {
        this.logger.log("NGO_CREATE EVENT RECEIVED");
        this.logger.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

        if (!payload.info?.recipients?.length) {
            this.logger.warn("No recipients in payload → skipping");
            return;
        }

        this.logger.log(`Found ${payload.info.recipients.length} recipient(s)`);

        // 1. SAVE TO DATABASE
        await this.saveNotificationToDatabase(
            payload.info.recipients,
            NotificationType.CAP_UPGRADE,
            payload.info.title,
            payload.info.message,
            payload.meta?.ngoId || null,
            payload.meta,
        );

        // 2. SEND REAL-TIME NOTIFICATIONS
        for (const r of payload.info.recipients) {
            this.logger.log(`--- Processing recipient: ${r.id} (${r.email}) ---`);

            const clients = this.getClientsForUser(r.id);
            this.logger.log(`  → Total connected sockets for this user: ${clients.size}`);

            if (clients.size === 0) {
                this.logger.warn(`  No active socket for user ${r.id} → notification NOT sent`);
                continue;
            }

            const client = Array.from(clients).find((c) => c.data.user?.ngo === true);

            if (!client) {
                this.logger.warn(`  User ${r.id} has socket but ngo toggle = false or missing`);
                continue;
            }

            this.logger.log(`  Sending notification to socket ${client.id}`);

            client.emit(EVENT_TYPES.NGO_CREATE, {
                type: EVENT_TYPES.NGO_CREATE,
                title: payload.info.title,
                message: payload.info.message,
                createdAt: new Date(),
                meta: payload.meta,
            } satisfies Notification);

            this.logger.log(`EMIT SUCCESS → NGO_CREATE sent to user ${r.id}`);
        }

        this.logger.log("NGO_CREATE processing complete");
    }

    // ==================== POST CREATE ====================
    @OnEvent(EVENT_TYPES.POST_CREATE)
    async handlePostCreated(payload: PostEvent) {
        this.logger.log("POST_CREATE EVENT RECEIVED");
        this.logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

        if (!payload.info?.recipients?.length) {
            this.logger.warn("No recipients → skipping");
            return;
        }

        this.logger.log(`Sending to ${payload.info.recipients.length} follower(s)`);

        // 1. SAVE TO DATABASE
        await this.saveNotificationToDatabase(
            payload.info.recipients,
            NotificationType.CAP_UPGRADE,
            payload.info.title,
            payload.info.message,
            payload.meta?.postId || null,
            payload.meta,
        );

        // 2. SEND REAL-TIME NOTIFICATIONS
        for (const r of payload.info.recipients) {
            const clients = this.getClientsForUser(r.id);

            if (clients.size === 0) {
                this.logger.debug(`No socket for user ${r.id}`);
                continue;
            }

            const client = Array.from(clients).find((c) => c.data.user?.post === true);
            if (!client) {
                this.logger.debug(`User ${r.id} has socket but post toggle = false`);
                continue;
            }

            const notification: Notification = {
                type: EVENT_TYPES.POST_CREATE,
                title: payload.info.title,
                message: payload.info.message,
                createdAt: new Date(),
                meta: payload.meta,
            };

            client.emit(EVENT_TYPES.POST_CREATE, notification);
            this.logger.log(`POST_CREATE → ${r.id} (socket ${client.id})`);
        }

        this.logger.log("POST_CREATE processing complete");
    }

    // ==================== CUSTOM CREATE ====================
    @OnEvent(EVENT_TYPES.CUSTOM_CREATE)
    async handleCustomCreated(payload: Custom) {
        this.logger.log("CUSTOM_CREATE EVENT RECEIVED");
        this.logger.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

        if (!payload.info?.recipients?.length) {
            this.logger.warn("No recipients → skipping");
            return;
        }

        // 1. SAVE TO DATABASE
        await this.saveNotificationToDatabase(
            payload.info.recipients,
            NotificationType.CAP_UPGRADE,
            payload.info.title,
            payload.info.message,
            null,
            payload.meta,
        );

        // 2. SEND REAL-TIME NOTIFICATIONS
        for (const r of payload.info.recipients) {
            const clients = this.getClientsForUser(r.id);

            if (clients.size === 0) {
                this.logger.warn(`No active socket for user ${r.id}`);
                continue;
            }

            const client = Array.from(clients).find((c) => c.data.user?.Custom === true);

            if (!client) {
                this.logger.warn(`User ${r.id} has socket but Custom toggle OFF`);
                continue;
            }

            client.emit(EVENT_TYPES.CUSTOM_CREATE, {
                type: EVENT_TYPES.CUSTOM_CREATE,
                title: payload.info.title,
                message: payload.info.message,
                createdAt: new Date(),
                meta: payload.meta,
            });

            this.logger.log(`CUSTOM_CREATE sent to ${r.id} (socket ${client.id})`);
        }
    }

    // ==================== CAP LEVEL CREATE ====================
    @OnEvent(EVENT_TYPES.CAPLEVEL_CREATE)
    async handleCapLevelCreated(payload: CapLevelEvent) {
        this.logger.log("CAPLEVEL_CREATE EVENT RECEIVED");
        this.logger.log(`Payload: ${JSON.stringify(payload, null, 2)}`);

        if (!payload.info?.recipients?.length) {
            this.logger.warn("No recipients → skipping");
            return;
        }

        this.logger.log(`Sending to ${payload.info.recipients.length} recipient(s)`);

        // 1. SAVE TO DATABASE
        await this.saveNotificationToDatabase(
            payload.info.recipients,
            NotificationType.CAP_UPGRADE,
            payload.info.title,
            payload.info.message,
            payload.meta?.postId || null,
            payload.meta,
        );

        // 2. SEND REAL-TIME NOTIFICATIONS
        for (const r of payload.info.recipients) {
            const clients = this.getClientsForUser(r.id);

            if (clients.size === 0) {
                this.logger.debug(`No socket for user ${r.id}`);
                continue;
            }

            const client = Array.from(clients).find((c) => c.data.user?.capLevel === true);

            if (!client) {
                this.logger.debug(`User ${r.id} has socket but capLevel toggle = false`);
                continue;
            }

            const notification: Notification = {
                type: EVENT_TYPES.CAPLEVEL_CREATE,
                title: payload.info.title,
                message: payload.info.message,
                createdAt: new Date(),
                meta: payload.meta,
            };

            client.emit(EVENT_TYPES.CAPLEVEL_CREATE, notification);
            this.logger.log(`CAPLEVEL_CREATE → ${r.id} (socket ${client.id})`);
        }

        this.logger.log("CAPLEVEL_CREATE processing complete");
    }
}
