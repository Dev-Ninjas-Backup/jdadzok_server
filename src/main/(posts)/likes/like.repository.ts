import { successResponse } from "@common/utils/response.util";
import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { CreateLikeDto } from "./dto/creaete.like.dto";

@Injectable()
export class LikeRepository {
    constructor(private readonly prisma: PrismaService) {}

    async alreadyLiked(userId: string, postId?: string, commentId?: string) {
        return await this.prisma.like.findFirst({
            where: {
                userId,
                postId,
                commentId,
            },
        });
    }

    async like(data: CreateLikeDto) {
        return await this.prisma.$transaction(async (tx) => {
            // get admin activity score that set by admin
            const adminActivityScore = await this.prisma.activityScore.findFirst();
            // Create the like
            const like = await tx.like.create({
                data: {
                    ...data,
                    userId: data.userId!,
                    postId: data.postId,
                },
            });

            // Update totalLikes in UserMetrics
            await tx.postMetrics.upsert({
                where: { postId: data.postId },
                create: {
                    postId: data.postId,
                    totalLikes: 1,
                },
                update: {
                    totalLikes: { increment: 1 },
                    lastUpdated: new Date(),
                },
            });

            // Update user metrics
            await tx.userMetrics.upsert({
                where: { userId: data.userId! },
                create: {
                    userId: data.userId!,
                    totalLikes: 1,
                },
                update: {
                    totalLikes: { increment: 1 },
                    lastUpdated: new Date(),
                },
            });

            // increment activity score
            await tx.userMetrics.update({
                where: {
                    userId: data.userId,
                },
                data: {
                    activityScore: { increment: adminActivityScore?.like },
                },
            });

            //  Return response
            return successResponse(like, data.commentId ? "Comment liked" : "Post liked");
        });
    }

    async removeLike(userId: string, postId: string, commentId?: string) {
        return await this.prisma.$transaction(async (tx) => {
            // get admin activity score that set by admin
            const adminActivityScore = await this.prisma.activityScore.findFirst();

            //  Delete like(s)
            const like = await tx.like.deleteMany({
                where: {
                    userId,
                    postId,
                    commentId,
                },
            });

            //  Only decrement if like existed
            if (like.count > 0) {
                await tx.userMetrics.updateMany({
                    where: { userId },
                    data: {
                        totalLikes: { decrement: like.count },
                        lastUpdated: new Date(),
                    },
                });
            }

            // decrement user activity sccore
            await tx.userMetrics.update({
                where: {
                    userId: userId,
                },
                data: {
                    activityScore: { decrement: adminActivityScore?.like },
                },
            });
            //  Return response
            return successResponse(like, commentId ? "Comment disliked" : "Post dislike");
        });
    }

    async getLikesForPost(postId: string) {
        const like = await this.prisma.like.findMany({
            where: { postId },
        });
        return like;
    }
}
