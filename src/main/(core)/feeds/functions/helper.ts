import { capLevel, CapLevel } from "@constants/enums";
import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class HelperFunctions {
    constructor(private readonly prisma: PrismaService) {}

    // Helper methods
    async updateFollowCounts(followerId: string, followingId: string, isFollow: boolean) {
        const increment = isFollow ? 1 : -1;

        await Promise.all([
            this.prisma.userMetrics.update({
                where: { userId: followerId },
                data: { totalFollowing: { increment } },
            }),
            this.prisma.userMetrics.update({
                where: { userId: followingId },
                data: { totalFollowers: { increment } },
            }),
            this.prisma.profile.update({
                where: { userId: followerId },
                data: { followingCount: { increment } },
            }),
            this.prisma.profile.update({
                where: { userId: followingId },
                data: { followersCount: { increment } },
            }),
        ]);
    }

    async createWelcomeNotification(userId: string) {
        await this.prisma.notification.create({
            data: {
                userId,
                type: "FOLLOW",
                title: "Welcome to the African Diaspora Community! 🎉",
                message:
                    "Start by completing your profile and making your first post to earn your Green Cap.",
            },
        });
    }

    async createFollowNotification(userId: string, followerId: string) {
        const follower = await this.prisma.user.findUnique({
            where: { id: followerId },
            include: { profile: true },
        });

        await this.prisma.notification.create({
            data: {
                userId,
                type: "FOLLOW",
                title: "New Follower",
                message: `${follower?.profile?.name} started following you!`,
                entityId: followerId,
            },
        });
    }

    async createCapUpgradeNotification(userId: string, newLevel: CapLevel) {
        const levelMessages: Record<CapLevel, string> = {
            NONE: "",
            GREEN: "Congratulations! You earned your Green Cap! 🟢",
            YELLOW: "Amazing! You upgraded to Yellow Cap! 🟡",
            RED: "Incredible! You reached Red Cap level! 🔴",
            BLACK: "Outstanding! You achieved Black Cap status! ⚫",
            OSTRICH_FEATHER: "Legendary! You earned the Ostrich Feather Cap! 🪶",
        };

        await this.prisma.notification.create({
            data: {
                userId,
                type: "EARNINGS",
                title: "Cap Level Upgrade!",
                message: levelMessages[newLevel] || "Your cap level has been upgraded!",
            },
        });
    }

    meetsCapRequirements(metrics: any, requirement: any): boolean {
        if (requirement.minActivityScore && metrics.activityScore < requirement.minActivityScore) {
            return false;
        }
        if (
            requirement.minVolunteerHours &&
            metrics.volunteerHours < requirement.minVolunteerHours
        ) {
            return false;
        }
        return true;
    }

    isCapLevelHigher(newLevel: CapLevel, currentLevel: CapLevel): boolean {
        return capLevel.indexOf(newLevel) > capLevel.indexOf(currentLevel);
    }

    async createTagNotifications(postId: string, authorId: string, taggedUserIds: string[]) {
        const author = await this.prisma.user.findUnique({
            where: { id: authorId },
            include: { profile: true },
        });

        await Promise.all(
            taggedUserIds.map((userId) =>
                this.prisma.notification.create({
                    data: {
                        userId,
                        type: "MENTION",
                        title: "You were tagged in a post",
                        message: `${author?.profile?.name} tagged you in a post`,
                        entityId: postId,
                    },
                }),
            ),
        );
    }
}
