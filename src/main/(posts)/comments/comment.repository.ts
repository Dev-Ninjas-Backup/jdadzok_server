import { PrismaService } from "@lib/prisma/prisma.service";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateCommentDto } from "./dto/create.comment.dto";
import { UpdateCommentDto } from "./dto/update.comment.dto";

@Injectable()
export class CommentRepository {
    constructor(private readonly prisma: PrismaService) {}

    // fix comment
    async createComment(data: CreateCommentDto) {
        return await this.prisma.$transaction(
            async (tx) => {
                const comment = await tx.comment.create({
                    data: {
                        ...data,
                        postId: data.postId,
                        authorId: data.authorId,
                    },
                });
                await tx.postMetrics.upsert({
                    where: { postId: data.postId },
                    create: { postId: data.postId, totalComments: 1 },
                    update: { totalComments: { increment: 1 }, lastUpdated: new Date() },
                });
                await tx.userMetrics.upsert({
                    where: { userId: data.authorId },
                    create: { userId: data.authorId, totalComments: 1 },
                    update: { totalComments: { increment: 1 }, lastUpdated: new Date() },
                });
                const post = await tx.post.findUnique({ where: { id: data.postId } });
                const adminScore = await tx.activityScore.findFirst();
                if (post && adminScore) {
                    await tx.userMetrics.update({
                        where: { userId: post.authorId },
                        data: { activityScore: { increment: adminScore.comment } },
                    });
                }
                return {
                    commentId: comment.id,
                    postId: comment.postId,
                    parentCommentId: comment.parentCommentId,
                    authorId: comment.authorId,
                    text: comment.text,
                    mediaUrl: comment.mediaUrl,
                    mediaType: comment.mediaType,
                    createdAt: comment.createdAt,
                };
            },
            { timeout: 10000 },
        );
    }

    async getCommentsForPost(postId: string) {
        return await this.prisma.comment.findMany({
            where: {
                postId,
                parentCommentId: null,
            },
            include: {
                author: {
                    include: {
                        profile: {
                            select: {
                                name: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
                replies: {
                    include: {
                        author: {
                            include: {
                                profile: {
                                    select: {
                                        name: true,
                                        avatarUrl: true,
                                    },
                                },
                            },
                        },
                    },
                },
                likes: true,
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async updateComment(commentId: string, authorId: string, data: UpdateCommentDto) {
        const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
        if (!comment) throw new NotFoundException("Comment not found");
        if (comment.authorId !== authorId) {
            throw new ForbiddenException("You are not authorized to update this comment");
        }

        return this.prisma.comment.update({
            where: { id: commentId },
            data: { text: data.text },
            include: {
                author: {
                    include: {
                        profile: { select: { name: true, avatarUrl: true } },
                    },
                },
            },
        });
    }

    async deleteComment(commentId: string, userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const comment = await tx.comment.findUnique({
                where: { id: commentId },
                include: { replies: { select: { id: true } } },
            });
            if (!comment) throw new NotFoundException("Comment not found");
            if (comment.authorId !== userId) {
                throw new ForbiddenException("You are not authorized to delete this comment");
            }

            const replyCount = comment.replies.length;
            const totalRemoved = 1 + replyCount;

            await tx.comment.deleteMany({
                where: { OR: [{ id: commentId }, { parentCommentId: commentId }] },
            });

            await tx.postMetrics.updateMany({
                where: { postId: comment.postId },
                data: {
                    totalComments: { decrement: totalRemoved },
                    lastUpdated: new Date(),
                },
            });

            await tx.userMetrics.updateMany({
                where: { userId: comment.authorId },
                data: {
                    totalComments: { decrement: 1 },
                    lastUpdated: new Date(),
                },
            });

            return { deleted: true, commentId };
        });
    }
}
