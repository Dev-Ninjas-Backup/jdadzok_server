import { Socket } from "socket.io";

export class SocketUtils {
    /**
     * Extract user ID from socket connection
     */
    static extractUserId(client: Socket): string | null {
        // Try different sources for user ID
        return (
            client.data?.userId ||
            client.handshake.auth?.userId ||
            (client.handshake.query?.userId as string) ||
            null
        );
    }

    /**
     * Get client IP address
     */
    static getClientIP(client: Socket): string {
        return (
            (client.handshake.headers["x-forwarded-for"] as string) ||
            (client.handshake.headers["x-real-ip"] as string) ||
            client.handshake.address ||
            "unknown"
        );
    }

    /**
     * Get user agent
     */
    static getUserAgent(client: Socket): string {
        return client.handshake.headers["user-agent"] || "unknown";
    }

    /**
     * Create a unique event ID
     */
    static generateEventId(prefix = "evt"): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Validate room name
     */
    static isValidRoomName(roomName: string): boolean {
        const roomNameRegex = /^[a-zA-Z0-9_-]+$/;
        return roomNameRegex.test(roomName) && roomName.length <= 50;
    }

    /**
     * Clean sensitive data from socket events
     */
    static sanitizeEventData(data: any): any {
        const sensitiveFields = ["password", "token", "accessToken", "apiKey", "secret"];
        const cleaned = { ...data };

        for (const field of sensitiveFields) {
            if (cleaned[field]) {
                cleaned[field] = "***REDACTED***";
            }
        }

        return cleaned;
    }
}
