import { Injectable, NotFoundException } from "@nestjs/common";
import { CreatePostsMetricsDto } from "./dto/posts-metrics.dto";
import { PostsMetricsRepository } from "./posts-metrics.repository";

@Injectable()
export class PostsMetricsService {
    constructor(private readonly repo: PostsMetricsRepository) {}

    async createMetrics(dto: CreatePostsMetricsDto) {
        return this.repo.create(dto);
    }

    async getMetrics(postId: string) {
        const metrics = await this.repo.findByPostId(postId);
        if (!metrics) throw new NotFoundException("Post metrics not found");
        return metrics;
    }

    // async updateMetrics(postId: string, dto: UpdatePostsMetricsDto) {
    //     await this.getMetrics(postId); // ensure exists
    //     return this.repo.update(postId, dto);
    // }

    async incrementLike(postId: string) {
        return this.repo.increment(postId, "totalLikes");
    }

    async decrementLike(postId: string) {
        return this.repo.decrement(postId, "totalLikes");
    }

    async incrementComment(postId: string) {
        return this.repo.increment(postId, "totalComments");
    }

    async incrementShare(postId: string) {
        return this.repo.increment(postId, "totalShares");
    }

    async incrementView(postId: string) {
        return this.repo.increment(postId, "totalViews");
    }

    // async deleteMetrics(postId: string) {
    //     return this.repo.delete(postId);
    // }
}
