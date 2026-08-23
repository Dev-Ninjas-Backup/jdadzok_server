import {
    Injectable,
    BadRequestException,
    ConflictException,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { CreateFollowDto } from "./dto/create-follow.dto";
import { successResponse } from "@common/utils/response.util";
import { Prisma } from "@prisma/client";

@Injectable()
export class FollowService {
    constructor(private readonly prisma: PrismaService) {}

    // toggle follow/unfollow another user
    async toggleFollow(followerId: string, dto: CreateFollowDto) {
        const { followingId } = dto;

        if (followerId === followingId) {
            throw new BadRequestException("You cannot follow yourself.");
        }

        const existing = await this.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
        });

        if (existing) {
            return await this.unfollowUser(followerId, followingId);
        }

        const follow = await this.followUser(followerId, followingId);
        return successResponse(follow, "User followed successfully");
    }

    /** Explicit follow — canonical one-way Follow row + denormalized counters. */
    async followUser(followerId: string, followingId: string) {
        if (followerId === followingId) {
            throw new BadRequestException("You cannot follow yourself.");
        }

        const [follower, following] = await Promise.all([
            this.prisma.user.findUnique({ where: { id: followerId } }),
            this.prisma.user.findUnique({ where: { id: followingId } }),
        ]);

        if (!follower || !following) {
            throw new BadRequestException("Invalid user");
        }

        const existing = await this.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
        });

        if (existing) {
            throw new ConflictException("You are already following this user");
        }

        return this.prisma.$transaction(async (tx) => {
            const follow = await tx.follow.create({
                data: { followerId, followingId },
                include: {
                    follower: { include: { profile: true } },
                    following: { include: { profile: true } },
                },
            });

            await this.adjustFollowCounts(tx, followerId, followingId, 1);
            return follow;
        });
    }

    async unfollowUser(followerId: string, followingId: string) {
        const existing = await this.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
        });

        if (!existing) {
            throw new NotFoundException("You must follow the user before unfollowing");
        }

        return this.prisma.$transaction(async (tx) => {
            await tx.follow.delete({
                where: { followerId_followingId: { followerId, followingId } },
            });

            await this.adjustFollowCounts(tx, followerId, followingId, -1);

            return successResponse({ unfollowed: true }, "User unfollowed successfully");
        });
    }

    private async adjustFollowCounts(
        tx: Prisma.TransactionClient,
        followerId: string,
        followingId: string,
        delta: 1 | -1,
    ) {
        await tx.userMetrics.upsert({
            where: { userId: followerId },
            create: { userId: followerId, totalFollowing: Math.max(0, delta) },
            update: {
                totalFollowing: { increment: delta },
                lastUpdated: new Date(),
            },
        });

        await tx.userMetrics.upsert({
            where: { userId: followingId },
            create: { userId: followingId, totalFollowers: Math.max(0, delta) },
            update: {
                totalFollowers: { increment: delta },
                lastUpdated: new Date(),
            },
        });

        await tx.profile.updateMany({
            where: { userId: followerId },
            data: { followingCount: { increment: delta } },
        });

        await tx.profile.updateMany({
            where: { userId: followingId },
            data: { followersCount: { increment: delta } },
        });
    }

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

    async isFollowing(followerId: string, followingId: string) {
        const follow = await this.prisma.follow.findUnique({
            where: { followerId_followingId: { followerId, followingId } },
        });

        return successResponse({ isFollowing: !!follow }, "Follow status checked");
    }
}
