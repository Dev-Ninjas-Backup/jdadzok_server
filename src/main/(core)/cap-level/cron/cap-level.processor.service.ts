import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { UserMetricsService } from "@module/(users)/profile-metrics/user-metrics.service";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { User } from "@prisma/client";
import { Queue } from "bullmq";
import { AdRevenueService } from "../../ad-revenue/ad-revenue.service";
import { CapLevelPromotionService } from "../cap-level-promotion.service";
import { CapLevelService } from "../cap-lavel.service";
import { PrismaService } from "@lib/prisma/prisma.service";

@Injectable()
export class CapLevelProcessorService {
    private readonly logger = new Logger(CapLevelProcessorService.name);

    constructor(
        @InjectQueue(QUEUE_JOB_NAME.CAP_LEVEL.CAP_LEVEL_QUEUE_NAME) private readonly queue: Queue,
        private readonly capLevelService: CapLevelService,
        private readonly capLevelPromotionService: CapLevelPromotionService,
        private readonly userMetricsService: UserMetricsService,
        private readonly adRevenueService: AdRevenueService,
        private readonly prisma: PrismaService,
    ) {
        this.logger.log("Cap Level Processor initialized");
    }

    /**
     * Auto-promote at most one ladder rung when score/hours qualify and no admin gate applies.
     * Never promotes to Red or Black — those require explicit admin review + audit trail.
     */
    async handleUserCaplevelCheckingAndDedicatedToUserusers(users: User[]) {
        const adminScore = await this.prisma.activityScore.findFirst();
        if (!adminScore) {
            throw new NotFoundException("Admin must set all activity scores for the platform.");
        }

        for (const user of users) {
            try {
                await this.userMetricsService.recalculateAndUpdateActivityScore(user.id);
                const result = await this.capLevelPromotionService.tryAutoPromote(user.id);
                if (result.promoted && result.toLevel) {
                    this.logger.log(`User ${user.id} auto-promoted to ${result.toLevel}`);
                }
            } catch (error) {
                this.logger.warn(
                    `Auto-promote skipped for user ${user.id}: ${
                        error instanceof Error ? error.message : error
                    }`,
                );
            }
        }
    }
}
