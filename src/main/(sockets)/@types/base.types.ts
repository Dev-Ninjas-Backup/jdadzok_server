// Base interfaces for all socket events
export interface BaseSocketEvent {
    eventId: string;
    timestamp: Date;
    userId: string;
    roomId?: string;
}

export interface SocketResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: Date;
}
