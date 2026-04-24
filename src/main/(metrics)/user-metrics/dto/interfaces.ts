export interface ActivityScoreWeights {
    posts: number;
    comments: number;
    likes: number;
    shares: number;
    followers: number;
    volunteerHours: number;
}

export interface UserEngagementData {
    postsCount: number;
    commentsCount: number;
    likesGivenCount: number;
    sharesCount: number;
    followersCount: number;
    volunteerHours: number;
}
