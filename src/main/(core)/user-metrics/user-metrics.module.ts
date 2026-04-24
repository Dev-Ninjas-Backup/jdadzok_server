import { Module } from "@nestjs/common";
import { UserMetricsController } from "./user-metrics.controller";

@Module({
    imports: [],
    controllers: [UserMetricsController],
    providers: [],
    exports: [],
})
export class UserMetricsModule {}
