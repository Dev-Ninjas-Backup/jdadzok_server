import { ENVEnum } from "@common/enum/env.enum";
import { TTL, TTLKey } from "@constants/ttl.constants";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { SocketRoom, SocketUser } from "../@types";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    public redisClient: Redis;
    private redisSubscriber: Redis;
    private redisPublisher: Redis;

    constructor(private readonly configService: ConfigService) {}

    async onModuleInit() {
        await this.connect();
    }

    async onModuleDestroy() {
        await this.disconnect();
    }

    private async connect() {
        try {
            const REDIS_PORT = Number(this.configService.get(ENVEnum.REDIS_PORT)) || 6379;
            const REDIS_HOST = this.configService.get(ENVEnum.REDIS_HOST) || "redis";

            // Main Redis client for general operations
            this.redisClient = new Redis(REDIS_PORT, REDIS_HOST);

            // Separate clients for pub/sub (recommended by Redis)
            // this.redisSubscriber = new Redis(REDIS_PORT, REDIS_HOST);
            // this.redisPublisher = new Redis(REDIS_PORT, REDIS_HOST);

            await Promise.all([
                // await this.redisClient.connect(),
                // await this.redisSubscriber.connect(),
                // this.redisPublisher.connect(),
            ]);

            this.logger.log("Redis connected successfully");

            // Handle connection events
            this.redisClient.on("error", (err) => {
                this.logger.error("Redis Client Error:", err);
            });

            // this.redisSubscriber.on("error", (err) => {
            //     this.logger.error("Redis Subscriber Error:", err);
            // });

            // this.redisPublisher.on("error", (err) => {
            //     this.logger.error("Redis Publisher Error:", err);
            // });
        } catch (error) {
            console.info(error.message);
            this.logger.error("Failed to connect to Redis");
        }
    }

    private async disconnect() {
        try {
            await Promise.all([
                this.redisClient?.quit(),
                this.redisSubscriber?.quit(),
                this.redisPublisher?.quit(),
            ]);
            this.logger.log("Redis disconnected");
        } catch (error) {
            this.logger.error("Error disconnecting from Redis:", error);
        }
    }

    // User Management Methods
    async setConnectedUser(socketId: string, user: SocketUser): Promise<void> {
        const pipeline = this.redisClient.pipeline();

        // Store user data by socket ID
        pipeline.hset(`socket:${socketId}`, {
            id: user.id,
            socketId: user.socketId,
            email: user.email || "",
            role: user.role,
            avatar: user.avatar || "",
            status: user.status,
            joinedAt: user.joinedAt.toISOString(),
        });

        // Map user ID to socket ID
        pipeline.set(`user:${user.id}:socket`, socketId);

        // Map socket ID to user ID
        pipeline.set(`socket:${socketId}:user`, user.id);

        // Add to online users set
        pipeline.sadd("online_users", user.id);

        // Set expiration (cleanup if server crashes)
        pipeline.expire(`socket:${socketId}`, 3600); // 1 hour
        pipeline.expire(`user:${user.id}:socket`, 3600);
        pipeline.expire(`socket:${socketId}:user`, 3600);

        await pipeline.exec();
    }

    async removeConnectedUser(socketId: string): Promise<void> {
        const userId = await this.redisClient.get(`socket:${socketId}:user`);
        if (!userId) return;

        const pipeline = this.redisClient.pipeline();

        // Remove user mappings
        pipeline.del(`socket:${socketId}`);
        pipeline.del(`user:${userId}:socket`);
        pipeline.del(`socket:${socketId}:user`);

        // Remove from online users
        pipeline.srem("online_users", userId);

        // Remove user from all rooms
        const userRoomsKey = `user:${userId}:rooms`;
        const userRooms = await this.redisClient.smembers(userRoomsKey);

        for (const roomId of userRooms) {
            pipeline.srem(`room:${roomId}:users`, userId);
            pipeline.srem(userRoomsKey, roomId);
        }

        pipeline.del(userRoomsKey);

        await pipeline.exec();
    }

    async getConnectedUser(socketId: string): Promise<SocketUser | null> {
        const userData = (await this.redisClient.hgetall(`socket:${socketId}`)) as Record<
            string,
            any
        > as SocketUser;

        if (!userData.id) return null;

        return {
            id: userData.id,
            socketId: userData.socketId,
            email: userData.email,
            avatar: userData.avatar,
            role: userData.role,
            status: userData.status,
            joinedAt: new Date(userData.joinedAt),
        };
    }

    async getUserSocketId(userId: string): Promise<string | null> {
        return await this.redisClient.get(`user:${userId}:socket`);
    }

    async getUserIdFromSocket(socketId: string): Promise<string | null> {
        return await this.redisClient.get(`socket:${socketId}:user`);
    }

    async getOnlineUsersCount(): Promise<number> {
        return await this.redisClient.scard("online_users");
    }

    async getOnlineUsers(): Promise<string[]> {
        return await this.redisClient.smembers("online_users");
    }

    // Room Management Methods
    async createRoom(roomId: string, roomData: SocketRoom): Promise<void> {
        const pipeline = this.redisClient.pipeline();

        // Store room data
        pipeline.hset(`room:${roomId}`, {
            id: roomData.id,
            name: roomData.name,
            type: roomData.type,
            createdAt: roomData.createdAt.toISOString(),
            metadata: JSON.stringify(roomData.metadata || {}),
        });

        // Initialize room users set
        pipeline.del(`room:${roomId}:users`);

        // Add room to active rooms
        pipeline.sadd("active_rooms", roomId);

        await pipeline.exec();
    }

    async addUserToRoom(roomId: string, userId: string): Promise<void> {
        const pipeline = this.redisClient.pipeline();

        // Add user to room
        pipeline.sadd(`room:${roomId}:users`, userId);

        // Add room to user's rooms
        pipeline.sadd(`user:${userId}:rooms`, roomId);

        await pipeline.exec();
    }

    async removeUserFromRoom(roomId: string, userId: string): Promise<void> {
        const pipeline = this.redisClient.pipeline();

        // Remove user from room
        pipeline.srem(`room:${roomId}:users`, userId);

        // Remove room from user's rooms
        pipeline.srem(`user:${userId}:rooms`, roomId);

        await pipeline.exec();

        // Check if room is empty and should be deleted
        const userCount = await this.redisClient.scard(`room:${roomId}:users`);
        if (userCount === 0) {
            await this.deleteRoom(roomId);
        }
    }

    async deleteRoom(roomId: string): Promise<void> {
        const pipeline = this.redisClient.pipeline();

        // Get all users in the room to clean up their room lists
        const users = await this.redisClient.smembers(`room:${roomId}:users`);

        for (const userId of users) {
            pipeline.srem(`user:${userId}:rooms`, roomId);
        }

        // Delete room data
        pipeline.del(`room:${roomId}`);
        pipeline.del(`room:${roomId}:users`);
        pipeline.srem("active_rooms", roomId);

        await pipeline.exec();
    }

    async getRoomUsers(roomId: string): Promise<string[]> {
        return await this.redisClient.smembers(`room:${roomId}:users`);
    }

    async getUserRooms(userId: string): Promise<string[]> {
        return await this.redisClient.smembers(`user:${userId}:rooms`);
    }
    async getRooms() {
        return await this.redisClient.smembers("rooms");
    }
    async getRoomData(roomId: string): Promise<SocketRoom | null> {
        const roomData = await this.redisClient.hgetall(`room:${roomId}`);

        if (!roomData.id) return null;

        const users = await this.getRoomUsers(roomId);
        const userObjects: SocketUser[] = [];

        // Get user details for each user in the room
        for (const userId of users) {
            const socketId = await this.getUserSocketId(userId);
            if (socketId) {
                const user = await this.getConnectedUser(socketId);
                if (user) {
                    userObjects.push(user);
                }
            }
        }

        return {
            id: roomData.id,
            name: roomData.name,
            type: roomData.type as "chat" | "post" | "call" | "private",
            users: userObjects,
            createdAt: new Date(roomData.createdAt),
            metadata: JSON.parse(roomData.metadata || "{}"),
        };
    }

    // Rate Limiting Methods
    async checkRateLimit(key: string, windowMs: number, maxRequests: number): Promise<boolean> {
        const now = Date.now();
        const window = Math.floor(now / windowMs);
        const rateLimitKey = `rate_limit:${key}:${window}`;

        const current = await this.redisClient.incr(rateLimitKey);

        if (current === 1) {
            // Set expiration on first request in this window
            await this.redisClient.expire(rateLimitKey, Math.ceil(windowMs / 1000));
        }

        return current <= maxRequests;
    }

    // Pub/Sub Methods for cross-server communication
    // async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    //     this.logger.error('subscribe....')
    //     await this.redisSubscriber.subscribe(channel);
    //     this.redisSubscriber.on("message", (receivedChannel, message) => {
    //         if (receivedChannel === channel) {
    //             callback(message);
    //         }
    //     });
    // }

    async publish(channel: string, message: any): Promise<void> {
        await this.redisPublisher.publish(channel, JSON.stringify(message));
    }

    async unsubscribe(channel: string): Promise<void> {
        await this.redisSubscriber.unsubscribe(channel);
    }

    // Utility Methods
    async setWithExpiry(key: string, value: string, expirySeconds: number): Promise<void> {
        await this.redisClient.setex(key, expirySeconds, value);
    }

    async get<T = any>(key: string): Promise<T | null> {
        const data = await this.redisClient.get(key);
        if (!data) return null;
        return JSON.parse(data);
    }

    async set<T = any>(key: string, value: T, ttlKey?: TTLKey) {
        await this.redisClient.set(key, JSON.stringify(value));

        if (ttlKey) {
            await this.redisClient.expire(key, TTL[ttlKey]); // Convert ms to seconds for Redis
        }
    }

    async del(key: string): Promise<void> {
        await this.redisClient.del(key);
    }

    async exists(key: string): Promise<boolean> {
        const result = await this.redisClient.exists(key);
        return result === 1;
    }

    // Health check
    async ping(): Promise<boolean> {
        try {
            const result = await this.redisClient.ping();
            return result === "PONG";
        } catch (error) {
            this.logger.error("Redis ping failed:", error);
            return false;
        }
    }
}
