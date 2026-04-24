// services/active-users.service.ts
import { Injectable } from "@nestjs/common";
import { RedisService } from "../services/redis.service";

interface UserPresence {
    userId: string;
    socketId: string;
    lastSeen: Date;
    status: "online" | "away" | "offline";
}

@Injectable()
export class ActiveUsersService {
    private readonly PRESENCE_KEY = "user:presence";
    private readonly ACTIVE_USERS_KEY = "users:active";
    private readonly TYPING_KEY = "chat:typing";

    constructor(private redis: RedisService) {}

    /**
     * Mark user as online when they connect
     */
    async setUserOnline(userId: string, socketId: string): Promise<void> {
        const now = new Date().toISOString();

        // Store user presence data
        await this.redis.redisClient.hset(`${this.PRESENCE_KEY}:${userId}`, {
            socketId,
            status: "online",
            lastSeen: now,
        });

        await this.redis.redisClient.sadd(this.ACTIVE_USERS_KEY, userId);

        await this.redis.redisClient.expire(`${this.PRESENCE_KEY}:${userId}`, 300);
    }

    /**
     * Mark user as offline when they disconnect
     */
    async setUserOffline(userId: string): Promise<void> {
        const now = new Date().toISOString();

        // Update last seen time
        await this.redis.redisClient.hset(`${this.PRESENCE_KEY}:${userId}`, {
            status: "offline",
            lastSeen: now,
        });

        await this.redis.redisClient.srem(this.ACTIVE_USERS_KEY, userId);

        // Keep offline status for 24 hours
        await this.redis.redisClient.expire(`${this.PRESENCE_KEY}:${userId}`, 86400);
    }

    /**
     * Update user's last activity timestamp
     */
    async updateActivity(userId: string): Promise<void> {
        const now = new Date().toISOString();

        await this.redis.redisClient.hset(`${this.PRESENCE_KEY}:${userId}`, "lastSeen", now);

        // Refresh expiry
        await this.redis.redisClient.expire(`${this.PRESENCE_KEY}:${userId}`, 300);
    }

    /**
     * Get all currently active users
     */
    async getActiveUsers(): Promise<string[]> {
        return this.redis.redisClient.smembers(this.ACTIVE_USERS_KEY);
    }

    /**
     * Check if a specific user is online
     */
    async isUserOnline(userId: string): Promise<boolean> {
        const result = await this.redis.redisClient.sismember(this.ACTIVE_USERS_KEY, userId);
        return result === 1;
    }

    /**
     * Get user presence information
     */
    async getUserPresence(userId: string): Promise<UserPresence | null> {
        const data = await this.redis.redisClient.hgetall(`${this.PRESENCE_KEY}:${userId}`);

        if (!data || Object.keys(data).length === 0) {
            return null;
        }

        return {
            userId,
            socketId: data.socketId,
            lastSeen: new Date(data.lastSeen),
            status: data.status as "online" | "away" | "offline",
        };
    }

    /**
     * Get presence for multiple users
     */
    async getMultipleUserPresence(userIds: string[]): Promise<Record<string, UserPresence | null>> {
        const presences: Record<string, UserPresence | null> = {};

        await Promise.all(
            userIds.map(async (userId) => {
                presences[userId] = await this.getUserPresence(userId);
            }),
        );

        return presences;
    }

    /**
     * Set user as typing in a chat
     */
    async setUserTyping(chatId: string, userId: string): Promise<void> {
        await this.redis.redisClient.sadd(`${this.TYPING_KEY}:${chatId}`, userId);
        // Auto-remove after 5 seconds
        await this.redis.redisClient.expire(`${this.TYPING_KEY}:${chatId}`, 5);
    }

    /**
     * Remove user from typing status
     */
    async removeUserTyping(chatId: string, userId: string): Promise<void> {
        await this.redis.redisClient.srem(`${this.TYPING_KEY}:${chatId}`, userId);
    }

    /**
     * Get users currently typing in a chat
     */
    async getUsersTyping(chatId: string): Promise<string[]> {
        return this.redis.redisClient.smembers(`${this.TYPING_KEY}:${chatId}`);
    }

    /**
     * Set user status (online, away, offline)
     */
    async setUserStatus(userId: string, status: "online" | "away" | "offline"): Promise<void> {
        await this.redis.redisClient.hset(`${this.PRESENCE_KEY}:${userId}`, "status", status);
    }

    /**
     * Get active users count
     */
    async getActiveUserCount(): Promise<number> {
        return this.redis.redisClient.scard(this.ACTIVE_USERS_KEY);
    }

    /**
     * Clean up stale presence data
     */
    async cleanupStalePresence(): Promise<void> {
        const activeUsers = await this.getActiveUsers();
        const now = new Date();
        const staleThreshold = 5 * 60 * 1000;

        for (const userId of activeUsers) {
            const presence = await this.getUserPresence(userId);

            if (presence && presence.lastSeen) {
                const timeDiff = now.getTime() - presence.lastSeen.getTime();

                if (timeDiff > staleThreshold) {
                    await this.setUserOffline(userId);
                }
            }
        }
    }
}
