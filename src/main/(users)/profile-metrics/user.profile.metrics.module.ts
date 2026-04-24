import { Module } from "@nestjs/common";
import { UserProfileMetricsController } from "./user.profile.metrics.controller";
import { UserProfileMetricsRepository } from "./user.profile.metrics.repository";
import { UserProfileMetricsService } from "./user.profile.metrics.service";

@Module({
    imports: [],
    controllers: [UserProfileMetricsController],
    providers: [UserProfileMetricsRepository, UserProfileMetricsService],
    exports: [UserProfileMetricsRepository, UserProfileMetricsService],
})
export class UserProfileMetricsModule {}
