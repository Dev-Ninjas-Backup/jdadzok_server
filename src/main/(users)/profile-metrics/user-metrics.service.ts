import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import {
    DEFAULT_IMPACT_SCORE_WEIGHTS,
    ImpactScoreBreakdown,
    ImpactScoreWeights,
    calculateImpactScore,
    sumEndorsementPoints,
} from "@common/utils/impact-score.util";
import { effectiveVolunteerHours } from "@common/utils/volunteer-hour.util";
import { UserMetrics } from "@prisma/client";

@Injectable()
export class UserMetricsService {
    constructor(private readonly prisma: PrismaService) {}

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

    /** Admin-editable weights from the activity-score table; defaults apply until a row exists. */
    async getImpactScoreWeights(): Promise<ImpactScoreWeights> {
        const row = await this.prisma.activityScore.findFirst();
        if (!row) return DEFAULT_IMPACT_SCORE_WEIGHTS;
        return {
            post: row.post,
            comment: row.comment,
            like: row.like,
            share: row.share,
            follower: row.follower,
            endorsement: row.endorsement,
            verifiedVolunteerHour: row.verifiedVolunteerHour,
            popularityCap: row.popularityCap,
            endorserLevelBonus: row.endorserLevelBonus,
        };
    }

    /**
     * Impact score: endorsements and verified contribution carry the score. Posts, comments,
     * likes, shares and followers are low-weight and capped in total (popularityCap).
     */
    async calculateImpactScoreBreakdown(userId: string): Promise<ImpactScoreBreakdown> {
        const engagement = await this.getUserEngagementData(userId);
        return this.scoreFromEngagement(engagement);
    }

    async calculateActivityScore(userId: string): Promise<number> {
        return (await this.calculateImpactScoreBreakdown(userId)).total;
    }

    private async scoreFromEngagement(
        engagement: Awaited<ReturnType<UserMetricsService["getUserEngagementData"]>>,
    ): Promise<ImpactScoreBreakdown> {
        const weights = await this.getImpactScoreWeights();
        return calculateImpactScore(
            {
                posts: engagement.postsCount,
                comments: engagement.commentsCount,
                likesGiven: engagement.likesGivenCount,
                shares: engagement.sharesCount,
                followers: engagement.followersCount,
                endorsementPoints: sumEndorsementPoints(
                    engagement.endorsers,
                    engagement.reciprocalEndorserIds,
                    weights.endorserLevelBonus,
                ),
                verifiedHours: engagement.verifiedHours,
            },
            weights,
        );
    }

    async recalculateAndUpdateActivityScore(userId: string): Promise<UserMetrics> {
        const engagementData = await this.getUserEngagementData(userId);
        const { total } = await this.scoreFromEngagement(engagementData);

        return await this.updateUserMetrics(userId, {
            activityScore: total,
            totalPosts: engagementData.postsCount,
            totalComments: engagementData.commentsCount,
            totalLikes: engagementData.likesGivenCount,
            totalShares: engagementData.sharesCount,
            totalFollowers: engagementData.followersCount,
        });
    }

    private async getUserEngagementData(userId: string) {
        // Get posts count (posts held by moderation earn nothing until approved)
        const postsCount = await this.prisma.post.count({
            where: { authorId: userId, isHidden: false },
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

        // Endorsements received from other members; self-endorsements never count
        const received = await this.prisma.endorsement.findMany({
            where: { toUserId: userId, fromUserId: { not: userId } },
            select: { fromUserId: true, fromUser: { select: { capLevel: true } } },
        });
        const endorsers = received.map((e) => ({
            fromUserId: e.fromUserId,
            level: e.fromUser.capLevel,
        }));

        // Endorsers this member endorsed back: reciprocal pairs are ignored
        const endorserIds = [...new Set(endorsers.map((e) => e.fromUserId))];
        const returned =
            endorserIds.length > 0
                ? await this.prisma.endorsement.findMany({
                      where: { fromUserId: userId, toUserId: { in: endorserIds } },
                      select: { toUserId: true },
                  })
                : [];
        const reciprocalEndorserIds = new Set(returned.map((e) => e.toUserId));

        const userMetrics = await this.getUserMetrics(userId);

        return {
            postsCount,
            commentsCount,
            likesGivenCount,
            sharesCount,
            followersCount,
            endorsers,
            reciprocalEndorserIds,
            verifiedHours: userMetrics ? effectiveVolunteerHours(userMetrics) : 0,
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
