import { BaseSocketEvent } from "./base.types";

// Post Events
export interface PostEvent<T = any> extends BaseSocketEvent {
    action: "create" | "update" | "delete";
    content?: T;
}

export interface PostReaction extends BaseSocketEvent {
    postId: string;
    reactionType: "like" | "love" | "laugh" | "angry" | "sad";
    action: "add" | "remove";
}

export interface PostComment extends BaseSocketEvent {
    postId: string;
    commentId: string;
    content: string;
    action: "create" | "update" | "delete";
    parentCommentId?: string;
}
