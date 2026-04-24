import { Injectable } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { successResponse } from "@common/utils/response.util";
import { CreateShareDto } from "./dto/create.share.dto";

@Injectable()
export class ShareService {
    constructor(private readonly prisma: PrismaService) {}

    // toggle share: if shared ---> unshare, else share.

    async sharePost(userId: string, dto: CreateShareDto) {
        const { postId } = dto;

        // check if already shared
        const existingShare = await this.prisma.share.findUnique({
            where: { userId_postId: { userId, postId } },
        });

        // if shared ---> unshare
        if (existingShare) {
            return await this.unsharePost(userId, postId);
        }

        // otherwise ---> share
        return await this.prisma.$transaction(async (tx) => {
            const share = await tx.share.create({
                data: {
                    userId,
                    postId,
                },
            });

            // update post metrics
            await tx.postMetrics.upsert({
                where: { postId },
                create: { postId, totalShares: 1 },
                update: {
                    totalShares: { increment: 1 },
                    lastUpdated: new Date(),
                },
            });

            // update user metrics
            await tx.userMetrics.upsert({
                where: { userId },
                create: { userId, totalShares: 1 },
                update: {
                    totalShares: { increment: 1 },
                    lastUpdated: new Date(),
                },
            });

            const userMatrix = await tx.userMetrics.findFirst({
                where: {
                    userId: share.userId,
                },
            });
            const adminScore = await tx.activityScore.findFirst();
            if (userMatrix) {
                await tx.userMetrics.update({
                    where: {
                        userId: share.userId,
                    },
                    data: {
                        activityScore: { increment: adminScore?.share },
                    },
                });
            }

            return successResponse(share, "Post shared successfully");
        });
    }

    // Unshare a post
    async unsharePost(userId: string, postId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const result = await tx.share.deleteMany({
                where: { userId, postId },
            });

            if (result.count > 0) {
                // decrement post & user metrics
                await tx.postMetrics.updateMany({
                    where: { postId },
                    data: {
                        totalShares: { decrement: result.count },
                        lastUpdated: new Date(),
                    },
                });

                await tx.userMetrics.updateMany({
                    where: { userId },
                    data: {
                        totalShares: { decrement: result.count },
                        lastUpdated: new Date(),
                    },
                });
            }

            const userMatrix = await tx.userMetrics.findFirst({
                where: {
                    userId: userId,
                },
            });
            const adminScore = await tx.activityScore.findFirst();
            if (userMatrix) {
                await tx.userMetrics.update({
                    where: {
                        userId: userId,
                    },
                    data: {
                        activityScore: { decrement: adminScore?.share },
                    },
                });
            }
            return successResponse(result, "Post unshared successfully");
        });
    }

    //Get all users who shared a post
    async getPostShares(postId: string) {
        const shares = await this.prisma.share.findMany({
            where: { postId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
        });

        return successResponse(shares, "Post shares fetched successfully");
    }

    // Get all posts a specific user has shared
    async getUserShares(userId: string) {
        const shares = await this.prisma.share.findMany({
            where: { userId },
            include: {
                post: {
                    select: {
                        id: true,
                        text: true,
                        mediaUrls: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return successResponse(shares, "User shared posts fetched successfully");
    }
}
