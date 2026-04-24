// src/call/types/call.types.ts

export enum CallStatus {
    CALLING = "CALLING",
    ACTIVE = "ACTIVE",
    ENDED = "ENDED",
    CANCELLED = "CANCELLED",
    MISSED = "MISSED",
    DECLINED = "DECLINED",
}

export interface CallParticipantInfo {
    id: string;
    socketId: string;
    userName: string;
    hasVideo: boolean;
    hasAudio: boolean;
    joinedAt: Date;
    leftAt?: Date;
}

export interface CallInfo {
    id: string;
    hostUserId: string;
    status: CallStatus;
    title?: string;
    isPrivate: boolean;
    startedAt?: Date;
    endedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    participants?: CallParticipantInfo[];
}

export interface ActiveCallRoom {
    callId: string;
    participants: {
        socketId: string;
        userName: string;
        hasVideo: boolean;
        hasAudio: boolean;
        joinedAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

// Socket event payloads
export interface SocketCallEvents {
    // Client -> Server
    joinCall: {
        callId: string;
        userName: string;
        hasVideo: boolean;
        hasAudio: boolean;
    };

    leaveCall: {
        callId: string;
    };

    startVideo: {
        callId: string;
    };

    stopVideo: {
        callId: string;
    };

    startAudio: {
        callId: string;
    };

    stopAudio: {
        callId: string;
    };

    offer: {
        targetSocketId: string;
        signal: RTCSessionDescriptionInit;
    };

    answer: {
        targetSocketId: string;
        signal: RTCSessionDescriptionInit;
    };

    iceCandidate: {
        targetSocketId: string;
        candidate: RTCIceCandidateInit;
    };

    // Server -> Client
    existingParticipants: {
        participants: {
            socketId: string;
            userName: string;
            hasVideo: boolean;
            hasAudio: boolean;
        }[];
    };

    participantJoined: {
        socketId: string;
        userName: string;
        hasVideo: boolean;
        hasAudio: boolean;
    };

    participantLeft: {
        socketId: string;
    };

    participantVideoStarted: {
        socketId: string;
    };

    participantVideoStopped: {
        socketId: string;
    };

    participantAudioStarted: {
        socketId: string;
    };

    participantAudioStopped: {
        socketId: string;
    };

    offerReceived: {
        offer: RTCSessionDescriptionInit;
        senderId: string;
    };

    answerReceived: {
        answer: RTCSessionDescriptionInit;
        senderId: string;
    };

    iceCandidateReceived: {
        candidate: RTCIceCandidateInit;
        senderId: string;
    };

    activeUsers: {
        count: number;
    };

    error: {
        message: string;
        code?: string;
    };
}

// WebRTC Configuration
export interface RTCConfig {
    iceServers: RTCIceServer[];
}

export const DEFAULT_RTC_CONFIG: RTCConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
    ],
};

// For production, you might want to add TURN servers:
export const PRODUCTION_RTC_CONFIG: RTCConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
            urls: "turn:your-turn-server.com:3478",
            username: "username",
            credential: "password",
        },
    ],
};

// Cache keys
export const CACHE_KEYS = {
    ACTIVE_USERS: "active_users",
    CALL_ROOM: (callId: string) => `call_room:${callId}`,
    USER_ROOM: (socketId: string) => `user_room:${socketId}`,
} as const;

// Error codes
export enum CallErrorCode {
    CALL_NOT_FOUND = "CALL_NOT_FOUND",
    PARTICIPANT_NOT_FOUND = "PARTICIPANT_NOT_FOUND",
    UNAUTHORIZED = "UNAUTHORIZED",
    CALL_FULL = "CALL_FULL",
    INVALID_SOCKET = "INVALID_SOCKET",
    MEDIA_ERROR = "MEDIA_ERROR",
    CONNECTION_ERROR = "CONNECTION_ERROR",
}

export class CallError extends Error {
    constructor(
        message: string,
        public code: CallErrorCode,
    ) {
        super(message);
        this.name = "CallError";
    }
}
