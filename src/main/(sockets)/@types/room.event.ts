import { BaseSocketEvent } from "./base.types";
import { SocketRoom } from "./socket.type";
export type RoomEventAction = "join" | "leave" | "create" | "delete";

// Room Events
export interface RoomEvent extends BaseSocketEvent {
    action: RoomEventAction;
    roomData?: Partial<SocketRoom>;
}
