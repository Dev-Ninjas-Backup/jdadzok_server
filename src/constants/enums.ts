export const role = ["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"] as const;
export type Role = (typeof role)[number];

export const authProvider = ["GOOGLE", "APPLE", "EMAIL", "FACEBOOK"] as const;
export type AuthProvider = (typeof authProvider)[number];

export const capLevel = ["NONE", "GREEN", "YELLOW", "RED", "BLACK", "OSTRICH_FEATHER"] as const;
export type CapLevel = (typeof capLevel)[number];

export const mediaType = ["IMAGE", "VIDEO", "GIF"] as const;
export type MediaType = (typeof mediaType)[number];

export const postVisibility = ["PUBLIC", "FOLLOWERS", "PRIVATE"] as const;
export type PostVisibility = (typeof postVisibility)[number];

export const volunteerStatus = ["OPEN", "IN_PROGRESS", "COMPLETED"] as const;
export type VolunteerStatus = (typeof volunteerStatus)[number];

export const applicationStatus = ["PENDING", "ACCEPTED", "REJECTED"] as const;
export type ApplicationStatus = (typeof applicationStatus)[number];

export const orderStatus = [
    "PENDING",
    "PAID",
    " SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
] as const;
export type OrderStatus = (typeof orderStatus)[number];

export const paymentMethod = ["STRIPE", "PAYPAL"] as const;
export type PaymentMethod = (typeof paymentMethod)[number];

export const paymentStatus = ["PENDING", "SUCCEEDED", "FAILED", "CANCELED"] as const;
export type PaymentStatus = (typeof paymentStatus)[number];

export const notificationType = [
    "VOLUNTEER_MATCH",
    "SYSTEM",
    "CAP_UPGRADE",
    "LIKE",
    "COMMENT",
    "FOLLOW",
    "SHARE",
    "MENTION",
    "EARNINGS",
] as const;
export type NotificationType = (typeof notificationType)[number];

export const reportTargetType = ["POST", "COMMENT", "USER"] as const;
export type ReportTargetType = (typeof reportTargetType)[number];

export const reportStatus = ["PENDING", "REVIEWED"] as const;
export type ReportStatus = (typeof reportStatus)[number];

export const chatType = ["TEXT", "MEDIA", "CALL"] as const;
export type ChatType = (typeof chatType)[number];

export const callType = ["AUDIO", "VIDEO"] as const;
export type CallType = (typeof callType)[number];
export const callStatus = ["CALLING", "RINING", "ACTIVE", "END", "MISSED", "DECLINED"] as const;
export type CallStatus = (typeof callStatus)[number];

export const messageStatus = ["SENT", "DELIVERED", "READ"] as const;
export type MessageStatus = (typeof messageStatus)[number];

export const payOutStatus = ["PENDING", "PAID"] as const;
export type PayOutStatus = (typeof payOutStatus)[number];

export const subscriptionStatus = ["PENDING", "ACTIVE", "INACTIVE", "CANCELED"] as const;
export type SubscriptionStatus = (typeof subscriptionStatus)[number];

export const feelings = [
    "HAPPY",
    "SAD",
    "ANGRY",
    "AMAZED",
    "AMUSED",
    "SCARED",
    "PROUD",
    "TIRED",
    "CONFUSED",
    "RELAXED",
    "EXCITED",
    "WORRIED",
    "LOVED",
    "GRATEFUL",
    "BLESSED",
    "HUNGRY",
    "HOPEFUL",
    "LONELY",
    "SILLY",
    "THANKFUL",
    "AWESOME",
    "BORED",
    "COOL",
    "DETERMINED",
    "IN_LOVE",
    "INSPIRED",
    "MOTIVATED",
    "SICK",
    "SLEEPY",
    "STRESSED",
    "STRONG",
    "FUNNY",
    "MEH",
] as const;
export type Feelings = (typeof feelings)[number];

export const communityType = ["PUBLIC", "PRIVATE", "CUSTOM"] as const;
export type CommunityType = (typeof communityType)[number];

export const communityRole = ["ADMIN", "MODERATOR", "MEMBER"] as const;
export type CommunityRole = (typeof communityRole)[number];

export const membershipStatus = ["PENDING", "APPROVED", "BANNED"] as const;
export type MembershipStatus = (typeof membershipStatus)[number];

export const identityVerificationType = [
    "GOVERMENT_AND_PASSPORT",
    "BUSINESS_CERTIFIED_AND_LICENSE",
] as const;
export type IdentityVerificationType = (typeof identityVerificationType)[number];

export const postFrom = ["COMMUNITY", "NGO", "REGULAR_PROFILE"] as const;
export type PostForm = (typeof postFrom)[number];

export const verificationStatus = ["PENDING", "APPROVED", "REJECTED"] as const;
export type VerificationStatus = (typeof verificationStatus)[number];

export const membershipTier = ["SILVER", "GOLD", "PLATINUM"] as const;
export type MembershipTier = (typeof membershipTier)[number];

export const gender = [
    "MALE",
    "FEMALE",
    "TRANSGENDER",
    "GENDERQUEER",
    "GENDERFLUID",
    "AGENDER",
    "BIGENDER",
    "PANGENDER",
] as const;
export type Gender = (typeof gender)[number];

export const withdrawStatus = ["PENDING", "PROCESSING", "SUCCESS", "FAILED"] as const;
export type WithdrawStatus = (typeof withdrawStatus)[number];

export const friendRequestStatus = ["PENDING", "ACCEPTED", "REJECTED"] as const;

export type FriendRequestStatus = (typeof friendRequestStatus)[number];
