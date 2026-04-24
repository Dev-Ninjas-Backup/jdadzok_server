import {
    CapLevelEvent,
    Comment,
    Community,
    Custom,
    Ngo,
    PostEvent,
    UserRegistration,
} from "./events-payload";

//  EVENT TYPE CONSTANTS (All in UPPERCASE for consistency)
export const EVENT_TYPES = {
    COMMUNITY_CREATE: "community.create",
    COMMUNITY_UPDATE: "community.update",
    COMMUNITY_DELETE: "community.delete",

    POST_CREATE: "post.create",
    POST_UPDATE: "post.update",
    POST_DELETE: "post.delete",

    NGO_CREATE: "ngo.create",
    NGO_UPDATE: "ngo.update",
    NGO_DELETE: "ngo.delete",

    COMMENT_CREATE: "comment.crate",
    COMMENT_UPDATE: "comment.update",
    COMMENT_DELETE: "comment.delete",

    USERREGISTRATION_CREATE: "user.create",
    USERREGISTRATION_UPDATE: "user.update",
    USERREGISTRATION_DELETE: "user.delete",

    MESSAGE_CREATE: "message.crate",
    CONVERSATION_CREATE: "conversation.create",

    CUSTOM_CREATE: "custom.create",
    CUSTOM_DELETE: "custom.delete",

    CAPLEVEL_CREATE: "caplevel.create",
    CAPLEVEL_UPDATE: "caplevel.update",
    CAPLEVEL_DELETE: "caplevel.delete",
} as const;

// Type-safe keys for autocomplete
export type EventType = keyof typeof EVENT_TYPES;

//  Event payload mapping for type safety
export interface EventPayloadMap {
    [EVENT_TYPES.COMMUNITY_CREATE]: Community;
    [EVENT_TYPES.COMMUNITY_UPDATE]: Community;
    [EVENT_TYPES.COMMUNITY_DELETE]: Community;

    [EVENT_TYPES.COMMENT_CREATE]: Comment;
    [EVENT_TYPES.COMMENT_UPDATE]: Comment;
    [EVENT_TYPES.COMMENT_DELETE]: Comment;

    [EVENT_TYPES.USERREGISTRATION_CREATE]: UserRegistration;
    [EVENT_TYPES.USERREGISTRATION_UPDATE]: UserRegistration;
    [EVENT_TYPES.USERREGISTRATION_DELETE]: UserRegistration;

    [EVENT_TYPES.POST_CREATE]: PostEvent;
    [EVENT_TYPES.POST_UPDATE]: PostEvent;
    [EVENT_TYPES.POST_DELETE]: PostEvent;

    [EVENT_TYPES.NGO_CREATE]: Ngo;
    [EVENT_TYPES.NGO_UPDATE]: Ngo;
    [EVENT_TYPES.NGO_DELETE]: Ngo;

    [EVENT_TYPES.CUSTOM_CREATE]: Custom;
    [EVENT_TYPES.MESSAGE_CREATE]?: any;

    [EVENT_TYPES.CAPLEVEL_CREATE]: CapLevelEvent;
    [EVENT_TYPES.CAPLEVEL_UPDATE]: CapLevelEvent;
    [EVENT_TYPES.CAPLEVEL_DELETE]: CapLevelEvent;
}
