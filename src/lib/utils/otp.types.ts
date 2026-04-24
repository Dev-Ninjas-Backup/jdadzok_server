import { TTLKey } from "@constants/ttl.constants";

export type OtpType = "RESET_PASSWORD" | "EMAIL_VERIFICATION"; // we can add more type here...

export interface OtpPayload {
    userId: string;
    email?: string;
    type: OtpType;
}

export interface OtpOptions {
    ttl?: TTLKey;
    length?: number;
}

export interface OtpRedisData {
    token: string;
    attempt: number;
    expireAt: string;
    userId: string;
    email?: string;
}

export interface OtpVerifyPayload {
    userId: string;
    type: OtpType;
    token: string;
}
