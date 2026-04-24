import { SOCKET_EVENTS } from "../constants/socket-events.constant";
import { CallEvent } from "./call.event";
import { ChatMessage, ChatTyping } from "./chat.event";
import { NotificationEvent } from "./notificaiton.event";
import { PostComment, PostEvent, PostReaction } from "./post.event";
import { RoomEvent } from "./room.event";
import { SocketUser } from "./socket.type";
import { UserStatusEvent } from "./user.event";

// Type helpers for event handling
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

    // Room Events
    [SOCKET_EVENTS.ROOM.JOIN]: RoomEvent;
    [SOCKET_EVENTS.ROOM.LEAVE]: RoomEvent;

    // Notification Events
    [SOCKET_EVENTS.NOTIFICATION.SEND]: NotificationEvent;
}
