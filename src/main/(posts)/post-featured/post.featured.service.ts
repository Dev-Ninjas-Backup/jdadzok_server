import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { TogglePostDto } from "./dto/toggle.post.dto";

@Injectable()
export class PostFeaturedService {
    constructor(private prisma: PrismaService) {}

    // Save a post
    async savePost(userId: string, postId: string) {
        return this.prisma.savedPost.create({
            data: { userId, postId },
        });
    }

    // Unsave a post
    async unsavePost(userId: string, postId: string) {
        return this.prisma.savedPost.deleteMany({
            where: { userId, postId },
        });
    }

    // Check if post is saved by user
    async isSaved(userId: string, postId: string) {
        const exists = await this.prisma.savedPost.findFirst({
            where: { userId, postId },
        });

        return { saved: !!exists };
    }

    // Get all saved posts
    async getMySavedPosts(userId: string) {
        return this.prisma.savedPost.findMany({
            where: { userId },
            include: {
                post: {
                    include: {
                        author: { include: { profile: true } },
                        community: true,
                        ngo: true,
                        comments: true,
                        likes: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async togglePostHide(userId: string, postId: string, dto: TogglePostDto) {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
        });

        if (post?.authorId !== userId) {
            throw new Error("Post not found or unauthorized");
        }
        const newHideValue = dto.hide ?? !post.isHidden;

        return this.prisma.post.update({
            where: { id: postId },
            data: { isHidden: newHideValue },
        });
    }

    async getMyHiddenPosts(userId: string) {
        return this.prisma.post.findMany({
            where: {
                authorId: userId,
                isHidden: true,
            },
            orderBy: {
                updatedAt: "desc",
            },
        });
    }
}
