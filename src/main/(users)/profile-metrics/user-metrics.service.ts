import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { UserMetrics } from "@prisma/client";

interface ActivityScoreWeights {
    posts: number;
    comments: number;
    likes: number;
    shares: number;
    followers: number;
}

@Injectable()
export class UserMetricsService {
    constructor(private readonly prisma: PrismaService) {}

    // Activity score calculation weights
    private readonly scoreWeights: ActivityScoreWeights = {
        posts: 5, // 5 points per post
        comments: 2, // 2 points per comment
        likes: 1, // 1 point per like given
        shares: 3, // 3 points per share
        followers: 0.5, // 0.5 points per follower
    };

    async createUserMetrics(userId: string, input: UserMetrics): Promise<UserMetrics> {
        return await this.prisma.userMetrics.create({
            data: {
                ...input,
                userId,
            },
        });
    }

    async getUserMetrics(userId: string) {
        return await this.prisma.userMetrics.findUnique({
            where: { userId },
        });
    }

    async updateUserMetrics(userId: string, data: Partial<UserMetrics>): Promise<UserMetrics> {
        return await this.prisma.userMetrics.upsert({
            where: { userId },
            update: {
                ...data,
                lastUpdated: new Date(),
            },
            create: {
                userId,
                ...data,
            },
        });
    }

    async calculateActivityScore(userId: string): Promise<number> {
        // Get current engagement data from the database
        const engagementData = await this.getUserEngagementData(userId);

        // Calculate activity score using weights
        const activityScore =
            engagementData.postsCount * this.scoreWeights.posts +
            engagementData.commentsCount * this.scoreWeights.comments +
            engagementData.likesGivenCount * this.scoreWeights.likes +
            engagementData.sharesCount * this.scoreWeights.shares +
            engagementData.followersCount * this.scoreWeights.followers;

        return Math.round(activityScore * 100) / 100; // Round to 2 decimal places
    }

    async recalculateAndUpdateActivityScore(userId: string): Promise<UserMetrics> {
        const newActivityScore = await this.calculateActivityScore(userId);
        const engagementData = await this.getUserEngagementData(userId);

        return await this.updateUserMetrics(userId, {
            activityScore: newActivityScore,
            totalPosts: engagementData.postsCount,
            totalComments: engagementData.commentsCount,
            totalLikes: engagementData.likesGivenCount,
            totalShares: engagementData.sharesCount,
            totalFollowers: engagementData.followersCount,
        });
    }

    private async getUserEngagementData(userId: string) {
        // Get posts count
        const postsCount = await this.prisma.post.count({
            where: { authorId: userId },
        });

        // Get comments count
        const commentsCount = await this.prisma.comment.count({
            where: { authorId: userId },
        });

        // Get likes given count
        const likesGivenCount = await this.prisma.like.count({
            where: { userId },
        });

        // Get shares count
        const sharesCount = await this.prisma.share.count({
            where: { userId },
        });

        // Get followers count
        const followersCount = await this.prisma.follow.count({
            where: { followingId: userId },
        });

        const userMetrics = await this.getUserMetrics(userId);

        return {
            postsCount,
            commentsCount,
            likesGivenCount,
            sharesCount,
            followersCount,
            ...userMetrics,
        };
    }

    async incrementPostCount(userId: string): Promise<UserMetrics> {
        const currentMetrics = await this.getUserMetrics(userId);
        return await this.updateUserMetrics(userId, {
            totalPosts: (currentMetrics?.totalPosts || 0) + 1,
        });
    }

    async incrementCommentCount(userId: string): Promise<UserMetrics> {
        const currentMetrics = await this.getUserMetrics(userId);
        return await this.updateUserMetrics(userId, {
            totalComments: (currentMetrics?.totalComments || 0) + 1,
        });
    }

    async incrementLikeCount(userId: string): Promise<UserMetrics> {
        const currentMetrics = await this.getUserMetrics(userId);
        return await this.updateUserMetrics(userId, {
            totalLikes: (currentMetrics?.totalLikes || 0) + 1,
        });
    }

    async incrementShareCount(userId: string): Promise<UserMetrics> {
        const currentMetrics = await this.getUserMetrics(userId);
        return await this.updateUserMetrics(userId, {
            totalShares: (currentMetrics?.totalShares || 0) + 1,
        });
    }

    async updateFollowerCount(userId: string): Promise<UserMetrics> {
        const followersCount = await this.prisma.follow.count({
            where: { followingId: userId },
        });

        return await this.updateUserMetrics(userId, {
            totalFollowers: followersCount,
        });
    }

    async updateVolunteerHours(userId: string, hours: number): Promise<UserMetrics> {
        const currentMetrics = await this.getUserMetrics(userId);
        return await this.updateUserMetrics(userId, {
            volunteerHours: (currentMetrics?.volunteerHours || 0) + hours,
        });
    }

    async addEarnings(userId: string, amount: number): Promise<UserMetrics> {
        const currentMetrics = await this.getUserMetrics(userId);
        const currentTotalEarnings = currentMetrics?.totalEarnings || 0;
        const currentMonthEarnings = currentMetrics?.currentMonthEarnings || 0;

        return await this.updateUserMetrics(userId, {
            totalEarnings: currentTotalEarnings + amount,
            currentMonthEarnings: currentMonthEarnings + amount,
        });
    }

    async resetMonthlyEarnings(userId: string): Promise<UserMetrics> {
        return await this.updateUserMetrics(userId, {
            currentMonthEarnings: 0,
        });
    }

    async getUsersWithHighActivity(minActivityScore = 50): Promise<UserMetrics[]> {
        return await this.prisma.userMetrics.findMany({
            where: {
                activityScore: {
                    gte: minActivityScore,
                },
            },
            orderBy: {
                activityScore: "desc",
            },
        });
    }

    async getUserActivityRank(userId: string): Promise<number> {
        const userMetrics = await this.getUserMetrics(userId);
        if (!userMetrics) return 0;

        const usersWithHigherScore = await this.prisma.userMetrics.count({
            where: {
                activityScore: {
                    gt: userMetrics.totalPosts,
                },
            },
        });

        return usersWithHigherScore + 1; // +1 because rank starts from 1
    }

    async getTopUsers(limit = 10): Promise<UserMetrics[]> {
        return await this.prisma.userMetrics.findMany({
            take: limit,
            orderBy: {
                activityScore: "desc",
            },
        });
    }

    // Bulk update for batch processing
    async bulkRecalculateActivityScores(userIds: string[]): Promise<void> {
        const batchSize = 50; // Process in batches to avoid memory issues

        for (let i = 0; i < userIds.length; i += batchSize) {
            const batch = userIds.slice(i, i + batchSize);

            await Promise.all(
                batch.map(async (userId) => {
                    try {
                        await this.recalculateAndUpdateActivityScore(userId);
                    } catch (error) {
                        console.error(
                            `Failed to recalculate activity score for user ${userId}:`,
                            error,
                        );
                    }
                }),
            );

            // Small delay between batches to reduce database load
            if (i + batchSize < userIds.length) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
    }
}
