import { Module } from "@nestjs/common";
import { PostsMetricsModule } from "./posts-metrics/posts-metrics.module";
import { UserMetricsModule } from "./user-metrics/user-metrics.module";

@Module({
    imports: [UserMetricsModule, PostsMetricsModule],
})
export class MetricsGroupModule {}
