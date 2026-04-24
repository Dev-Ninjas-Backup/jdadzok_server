import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { CreateFollowDto } from "./dto/create-follow.dto";
import { successResponse } from "@common/utils/response.util";

@Injectable()
export class FollowService {
    constructor(private readonly prisma: PrismaService) {}

    // toggle follow/unfollow another user
    async toggleFollow(followerId: string, dto: CreateFollowDto) {
        const { followingId } = dto;

        if (followerId === followingId) {
            throw new BadRequestException("You cannot follow yourself.");
        }

        // check if already following
        const existing = await this.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
        });

        // if already following → unfollow
        if (existing) {
            return await this.unfollowUser(followerId, followingId);
        }

        // otherwise --> follow
        return await this.prisma.$transaction(async (tx) => {
            const follow = await tx.follow.create({
                data: {
                    followerId,
                    followingId,
                },
            });

            // update metrics
            await tx.userMetrics.upsert({
                where: { userId: followerId },
                create: { userId: followerId, totalFollowing: 1 },
                update: {
                    totalFollowing: { increment: 1 },
                    lastUpdated: new Date(),
                },
            });

            await tx.userMetrics.upsert({
                where: { userId: followingId },
                create: { userId: followingId, totalFollowers: 1 },
                update: {
                    totalFollowers: { increment: 1 },
                    lastUpdated: new Date(),
                },
            });

            return successResponse(follow, "User followed successfully");
        });
    }

    // unfollow user
    async unfollowUser(followerId: string, followingId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const result = await tx.follow.deleteMany({
                where: { followerId, followingId },
            });

            if (result.count > 0) {
                // update metrics
                await tx.userMetrics.updateMany({
                    where: { userId: followerId },
                    data: {
                        totalFollowing: { decrement: result.count },
                        lastUpdated: new Date(),
                    },
                });

                await tx.userMetrics.updateMany({
                    where: { userId: followingId },
                    data: {
                        totalFollowers: { decrement: result.count },
                        lastUpdated: new Date(),
                    },
                });
            }

            return successResponse(result, "User unfollowed successfully");
        });
    }

    // get list of followers for a user

    async getFollowers(userId: string) {
        const followers = await this.prisma.follow.findMany({
            where: { followingId: userId },
            include: {
                follower: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return successResponse(followers, "Followers fetched successfully");
    }

    // get list of users the user is following

    async getFollowing(userId: string) {
        const following = await this.prisma.follow.findMany({
            where: { followerId: userId },
            include: {
                following: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return successResponse(following, "Following fetched successfully");
    }

    // check if one user is following another

    async isFollowing(followerId: string, followingId: string) {
        const follow = await this.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
        });

        return successResponse({ isFollowing: !!follow }, "Follow status checked");
    }
}
