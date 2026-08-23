import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { UserModule } from "@module/(users)/users/users.module";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { UserMetricsService } from "../../(users)/profile-metrics/user-metrics.service";
import { AdRevenueService } from "../ad-revenue/ad-revenue.service";
import { CapLevelRepository } from "./cap-lavel.repository";
import { CapLevelService } from "./cap-lavel.service";
import { CapLevelController } from "./cap-level.controller";
import { CapLevelCronJobProcessor } from "./cron/cap-level.cron-job.processor";
import { CapLevelCronJobService } from "./cron/cap-level.cron-job.service";
import { CapLevelProcessorService } from "./cron/cap-level.processor.service";
import { SkyBlueNominationController } from "./sky-blue-nomination.controller";
import { SkyBlueNominationService } from "./sky-blue-nomination.service";
import { CapLevelPromotionService } from "./cap-level-promotion.service";

@Module({
    imports: [
        BullModule.registerQueue({
            name: QUEUE_JOB_NAME.CAP_LEVEL.CAP_LEVEL_QUEUE_NAME,
        }),
        UserModule,
    ],
    controllers: [CapLevelController, SkyBlueNominationController],
    providers: [
        CapLevelCronJobProcessor,
        CapLevelCronJobService,
        CapLevelRepository,
        CapLevelService,
        CapLevelPromotionService,
        CapLevelProcessorService,
        UserMetricsService,
        AdRevenueService,
        SkyBlueNominationService,
    ],
    exports: [
        CapLevelService,
        CapLevelPromotionService,
        UserMetricsService,
        AdRevenueService,
        SkyBlueNominationService,
    ],
})
export class CapLevelModule {}
