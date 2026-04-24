import { Role } from "@constants/enums";
import { SocketEventMap } from "./socket.event.map";
import { UserStatus } from "./user.event";

export interface SocketUser {
    id: string;
    socketId: string;
    email: string;
    avatar?: string;
    role: Role;
    status: UserStatus;
    joinedAt: Date;
}

export interface SocketRoom {
    id: string;
    name: string;
    type: "chat" | "post" | "call" | "private";
    users: SocketUser[];
    createdAt: Date;
    metadata?: Record<string, any>;
}

// Utility type for extracting event data type
export type EventData<T extends keyof SocketEventMap> = SocketEventMap[T];

// Rate limiting configuration
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    blockDuration?: number;
}

export const RATE_LIMITS = {
    CHAT_MESSAGE: { windowMs: 1000, maxRequests: 5 },
    POST_CREATE: { windowMs: 60000, maxRequests: 10 },
    CALL_INITIATE: { windowMs: 30000, maxRequests: 3 },
    ROOM_JOIN: { windowMs: 10000, maxRequests: 5 },
} as const;
