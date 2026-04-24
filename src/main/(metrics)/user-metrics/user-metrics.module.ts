import { Module } from "@nestjs/common";
import { UserMetricsController } from "./user-metrics.controller";
import { UserMetricsService } from "./user-metrics.service";

@Module({
    controllers: [UserMetricsController],
    providers: [UserMetricsService],
    exports: [UserMetricsService],
})
export class UserMetricsModule {}
