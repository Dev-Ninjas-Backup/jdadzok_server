import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { CreateCommentDto } from "./dto/create.comment.dto";

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

    async deleteComment(commentId: string) {
        return await this.prisma.comment.delete({
            where: { id: commentId },
        });
    }
}
