import { BaseSocketEvent } from "./base.types";

export type NotificationType = "message" | "post_like" | "comment" | "call" | "system";
// Notification Events
export interface NotificationEvent extends BaseSocketEvent {
    type: NotificationType;
    title: string;
    content: string;
    actionUrl?: string;
    read: boolean;
}
