import { Like, Post, Share, User } from "@prisma/client";

class FeedAlgorithm {
    public scorePost(
        post: Post & {
            author: User & { Choice?: { slug: string }[] };
            likes: Like[];
            shares: Share[];
        },
        userId: string,
        userChoices: string[],
        followingIds: string[],
    ): number {
        let score = 0;

        // Boost for posts by followed users
        if (followingIds.includes(post.authorId)) score += 10;

        // Boost if author has similar interests
        const authorChoices = post.author.Choice?.map((c) => c.slug) ?? [];
        const shared = authorChoices.filter((c) => userChoices.includes(c)).length;
        score += shared * 5;

        // Engagement score
        score += post.likes.length * 2;
        score += post.shares.length * 3;

        // Boost for recency (simple decay over time)
        const hoursAgo = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
        score -= Math.floor(hoursAgo / 2); // lose 1 point every 2 hours
        return score;
    }
}
export default new FeedAlgorithm();
