type PostMetricsRecord = {
    totalComments?: number;
    totalLikes?: number;
    totalShares?: number;
    totalViews?: number;
} | null;

export interface PostEngagementCounts {
    commentsCount: number;
    likesCount: number;
    sharesCount: number;
    viewsCount: number;
}

export function mapPostMetrics(metrics?: PostMetricsRecord): PostEngagementCounts {
    return {
        commentsCount: metrics?.totalComments ?? 0,
        likesCount: metrics?.totalLikes ?? 0,
        sharesCount: metrics?.totalShares ?? 0,
        viewsCount: metrics?.totalViews ?? 0,
    };
}

export function enrichPostWithMetrics<T extends { metrics?: PostMetricsRecord }>(
    post: T,
): Omit<T, "metrics"> & PostEngagementCounts {
    const { metrics, ...rest } = post;
    return { ...rest, ...mapPostMetrics(metrics) };
}

export function enrichPostsWithMetrics<T extends { metrics?: PostMetricsRecord }>(
    posts: T[],
): (Omit<T, "metrics"> & PostEngagementCounts)[] {
    return posts.map(enrichPostWithMetrics);
}
