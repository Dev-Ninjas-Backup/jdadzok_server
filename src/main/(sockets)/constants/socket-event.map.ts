import { PostEvent } from "@module/(posts)/posts/events";
import {
    CallEvent,
    ChatMessage,
    ChatTyping,
    NotificationEvent,
    PostComment,
    PostReaction,
    RoomEvent,
    SocketUser,
    UserStatusEvent,
} from "../@types";
import { SOCKET_EVENTS } from "./socket-events.constant";

export interface SocketEventMap {
    // Connection Events
    [SOCKET_EVENTS.CONNECTION.USER_JOINED]: SocketUser;
    [SOCKET_EVENTS.CONNECTION.USER_LEFT]: { userId: string; reason?: string };
    [SOCKET_EVENTS.CONNECTION.USER_STATUS]: UserStatusEvent;

    // Chat Events
    [SOCKET_EVENTS.CHAT.MESSAGE_SEND]: ChatMessage;
    [SOCKET_EVENTS.CHAT.MESSAGE_RECEIVE]: ChatMessage;
    [SOCKET_EVENTS.CHAT.MESSAGE_TYPING]: ChatTyping;

    // Post Events
    [SOCKET_EVENTS.POST.CREATE]: PostEvent;
    [SOCKET_EVENTS.POST.LIKE]: PostReaction;
    [SOCKET_EVENTS.POST.COMMENT_ADD]: PostComment;

    // Call Events
    [SOCKET_EVENTS.CALL.INITIATE]: CallEvent;
    [SOCKET_EVENTS.CALL.ACCEPT]: CallEvent;
    [SOCKET_EVENTS.CALL.ICE_CANDIDATE]: CallEvent;
    [SOCKET_EVENTS.CALL.OFFER]: CallEvent;

    // Room Events
    [SOCKET_EVENTS.ROOM.JOIN]: RoomEvent;
    [SOCKET_EVENTS.ROOM.LEAVE]: RoomEvent;

    // Notification Events
    [SOCKET_EVENTS.NOTIFICATION.SEND]: NotificationEvent;
}

export type EventData<T extends keyof SocketEventMap> = SocketEventMap[T];
