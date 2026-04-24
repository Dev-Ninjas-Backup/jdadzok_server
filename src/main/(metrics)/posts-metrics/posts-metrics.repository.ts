import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { HelperTx, MakeRequired } from "@type/index";
import { CreatePostsMetricsDto, UpdatePostsMetricsDto } from "./dto/posts-metrics.dto";

@Injectable()
export class PostsMetricsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: MakeRequired<CreatePostsMetricsDto, "postId">, tx?: HelperTx) {
        if (tx) {
            return await tx.postMetrics.create({
                data: {
                    postId: dto.postId,
                    totalLikes: dto.totalLikes ?? 0,
                    totalComments: dto.totalComments ?? 0,
                    totalShares: dto.totalShares ?? 0,
                    totalViews: dto.totalViews ?? 0,
                },
            });
        } else {
            return await this.prisma.postMetrics.create({
                data: {
                    postId: dto.postId,
                    totalLikes: dto.totalLikes ?? 0,
                    totalComments: dto.totalComments ?? 0,
                    totalShares: dto.totalShares ?? 0,
                    totalViews: dto.totalViews ?? 0,
                },
            });
        }
    }

    async findByPostId(postId: string) {
        return this.prisma.postMetrics.findUnique({ where: { postId } });
    }

    // async update(postId: string, dto: UpdatePostsMetricsDto) {
    //     return this.prisma.postMetrics.update({
    //         where: { postId },
    //         data: { ...dto, lastUpdated: new Date() },
    //     });
    // }

    async increment(postId: string, field: keyof UpdatePostsMetricsDto, amount = 1) {
        return this.prisma.postMetrics.update({
            where: { postId },
            data: {
                [field]: { increment: amount },
                lastUpdated: new Date(),
            },
        });
    }

    async decrement(postId: string, field: keyof UpdatePostsMetricsDto, amount = 1) {
        return this.prisma.postMetrics.update({
            where: { postId },
            data: {
                [field]: { decrement: amount },
                lastUpdated: new Date(),
            },
        });
    }

    //     async delete(postId: string) {
    //         return this.prisma.postMetrics.delete({ where: { postId } });
    //     }
}
