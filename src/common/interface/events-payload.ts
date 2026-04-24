import {
    CapLevelMeta,
    CommentMeta,
    CommunityMeta,
    CustomMeta,
    MessageMeta,
    NgoMeta,
    PostMeta,
    UserRegistrationMeta,
} from "./events-meta";

//  Generic Base Event
export interface BaseEvent<TMeta> {
    action: "CREATE" | "UPDATE" | "DELETE";
    meta: TMeta;
}

//  Notification Base
export interface Notification {
    type: string;
    title: string;
    message: string;
    createdAt: Date;
    meta: Record<string, any>;
}

//  Individual Events

export interface UserRegistration extends BaseEvent<UserRegistrationMeta> {
    info: {
        email: string;
        id: string;
        name: string;
        role: string;
    };
}

// Community Event
export interface Community extends BaseEvent<CommunityMeta> {
    info: {
        title: string;
        message: string;
        recipients: { email: string; id: string }[];
    };
}

export interface Ngo extends BaseEvent<NgoMeta> {
    info: {
        title: string;
        message: string;
        recipients: { email: string; id: string }[];
    };
}

// Comment Event
export interface Comment extends BaseEvent<CommentMeta> {
    info: {
        title: string;
        message: string;
        recipients: { email: string; id: string }[];
    };
}

// Post Event
export interface PostEvent extends BaseEvent<PostMeta> {
    action: "CREATE" | "UPDATE" | "DELETE";
    meta: PostMeta;
    info: {
        title: string;
        message: string;
        authorId: string;
        recipients: { id: string; email: string }[];
    };
}

// -----------------CAPLEVEL-------------------
export interface CapLevelEvent extends BaseEvent<CapLevelMeta> {
    action: "CREATE" | "UPDATE" | "DELETE";
    meta: CapLevelMeta;
    info: {
        title: string;
        message: string;
        authorId: string;
        caplevelDetials: [{}];
        recipients: { id: string; email: string }[];
    };
}

//  Message Event
export interface Message extends BaseEvent<MessageMeta> {
    info: {
        fromUserId: string;
        toUserId: string;
        content: string;
        sendEmail: boolean;
    };
}
export interface Custom extends BaseEvent<CustomMeta> {
    info: {
        title: string;
        message: string;
        recipients: { id: string; email: string }[];
    };
}
