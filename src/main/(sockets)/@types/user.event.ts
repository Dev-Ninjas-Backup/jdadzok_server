import { BaseSocketEvent } from "./base.types";

export type UserStatus = "online" | "away" | "busy" | "offline";

// User Events
export interface UserStatusEvent extends BaseSocketEvent {
    status: UserStatus;
    lastSeen?: Date;
}
