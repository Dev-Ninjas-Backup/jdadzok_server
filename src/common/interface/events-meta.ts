// Community specific meta
export interface CommunityMeta {
    communityId: string;
    performedBy: string;
    foundationDate: Date;
}

// Comment specific meta
export interface CommentMeta {
    commentId: string;
    postId: string;
    performedBy: string;
    publishedAt: Date;
}

// User registration specific meta
export interface UserRegistrationMeta {
    userId: string;
    performedBy?: string;
    registeredAt: Date;
}

// Post event meta
export interface PostMeta {
    postId: string;
    performedBy: string;
    publishedAt: Date;
}

export interface CapLevelMeta {
    postId: string;
    performedBy: string;
    publishedAt: Date;
}
// Message event meta
export interface MessageMeta {
    messageId: string;
    fromUserId: string;
    toUserId: string;
    sentAt: Date;
}

export interface NgoMeta {
    ngoId: string;
    ownerBy: string;
}

export interface CustomMeta {
    title: string;
    message: string;
}
