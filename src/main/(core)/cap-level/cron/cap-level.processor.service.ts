import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { UserMetricsService } from "@module/(users)/profile-metrics/user-metrics.service";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CapLevel, User } from "@prisma/client";
import { Queue } from "bullmq";
import { AdRevenueService } from "../../ad-revenue/ad-revenue.service";

import { CapLevelService } from "../cap-lavel.service";
// import {
//     BatchMetricsJobData,
//     BatchPromotionJobData,
//     MonthlyRevenueJobData,
//     UserMetricsUpdateJobData,
//     UserPromotionJobData,
//     VolunteerHoursJobData,
// } from "../types";
import { PrismaService } from "@lib/prisma/prisma.service";

@Injectable()
export class CapLevelProcessorService {
    private readonly logger = new Logger(CapLevelProcessorService.name);

    constructor(
        @InjectQueue(QUEUE_JOB_NAME.CAP_LEVEL.CAP_LEVEL_QUEUE_NAME) private readonly queue: Queue,
        private readonly capLevelService: CapLevelService,
        private readonly userMetricsService: UserMetricsService,
        private readonly adRevenueService: AdRevenueService,
        private readonly prisma: PrismaService,
    ) {
        this.logger.log("Cap Level Processor initialized");
    }

    async handleUserCaplevelCheckingAndDedicatedToUserusers(users: User[]) {
        const adminScore = await this.prisma.activityScore.findFirst();
        if (!adminScore) {
            throw new NotFoundException("Admin must set all activity scores for the platform.");
        }

        for (const user of users) {
            const userMatrix = await this.prisma.userMetrics.findFirst({
                where: { userId: user.id },
            });

            if (!userMatrix) {
                console.info(`User ${user.id} has no metrics — skipping.`);
                continue;
            }

            const score = userMatrix.activityScore;

            // Below threshold
            if (score < adminScore.greenCapScore) {
                console.info(`User ${user.id} not eligible for cap promotion.`);
                continue;
            }

            let newCapLevel: CapLevel | null = null;

            if (score >= adminScore.blackCapScore) {
                newCapLevel = CapLevel.BLACK;
            } else if (score >= adminScore.redCapScore) {
                newCapLevel = CapLevel.RED;
            } else if (score >= adminScore.yellowCapScore) {
                newCapLevel = CapLevel.YELLOW;
            } else if (score >= adminScore.greenCapScore) {
                newCapLevel = CapLevel.GREEN;
            }

            // If eligible and changed, update DB
            if (newCapLevel && user.capLevel !== newCapLevel) {
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { capLevel: newCapLevel },
                });
                console.info(`User ${user.id} promoted to ${newCapLevel}`);
            }
        }
    }
}
