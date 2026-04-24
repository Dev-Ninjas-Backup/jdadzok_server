import { TTLKey } from "@constants/ttl.constants";

export type MailTemplateType = "otp" | "friend-request";

export interface MailContext {
    otp?: string;
    senderName?: string;
    avatarUrl?: string;
    expire?: TTLKey;
    // it is allow to passing anothers key value that i'm not define yet
    [key: string]: string | number | boolean | undefined;
}
