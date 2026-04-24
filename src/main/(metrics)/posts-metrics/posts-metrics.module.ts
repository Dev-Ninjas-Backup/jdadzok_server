import { Module } from "@nestjs/common";
import { PostsMetricsService } from "./posts-metrics.service";
import { PostsMetricsController } from "./posts-metrics.controller";
import { PostsMetricsRepository } from "./posts-metrics.repository";

@Module({
    imports: [],
    controllers: [PostsMetricsController],
    providers: [PostsMetricsRepository, PostsMetricsService],
    exports: [],
})
export class PostsMetricsModule {}
