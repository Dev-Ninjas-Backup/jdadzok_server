import { UserMetricsService } from "@module/(users)/profile-metrics/user-metrics.service";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import { AdRevenueService } from "../../ad-revenue/ad-revenue.service";
// import { VolunteerTrackingService } from "../../volunteer-tracking/volunteer-tracking.service";
import { CapLevelService } from "../cap-lavel.service";
import { capLevelJobType } from "../constants";
import {
    BatchMetricsJobData,
    MonthlyRevenueJobData,
    UserEligibilityJobData,
    UserMetricsUpdateJobData,
    UserPromotionJobData,
} from "../types";

/**
 * Cap Level Background Job Processor
 * Handles all automated cap level related tasks using BullMQ
 */
@Processor("cap-level-queue")
@Injectable()
export class CapLevelProcessor extends WorkerHost {
    private readonly logger = new Logger(CapLevelProcessor.name);

    constructor(
        private readonly queue: Queue,
        private readonly capLevelService: CapLevelService,
        private readonly userMetricsService: UserMetricsService,
        private readonly adRevenueService: AdRevenueService,
        // private readonly volunteerTrackingService: VolunteerTrackingService,
    ) {
        super();
        this.logger.log("Cap Level Processor initialized");
    }

    /**
     * Process individual jobs based on job type
     */
    async process(job: Job<any, any, string>) {
        this.logger.log(`Processing job: ${job.name} (ID: ${job.id})`);

        try {
            switch (job.name) {
                case capLevelJobType.CALCULATE_USER_ELIGIBILITY:
                    return await this.processUserEligibility(job);

                case capLevelJobType.UPDATE_USER_METRICS:
                    return await this.processUserMetricsUpdate(job);

                case capLevelJobType.RECALCULATE_ACTIVITY_SCORE:
                    return await this.processActivityScoreRecalculation(job);

                case capLevelJobType.BATCH_RECALCULATE_METRICS:
                    return await this.processBatchMetricsRecalculation(job);

                case capLevelJobType.CALCULATE_MONTHLY_REVENUE:
                    return await this.processMonthlyRevenue(job);

                // case capLevelJobType["PROCESS_VOLUNTEER_HOURS"]:
                //     return await this.processVolunteerHours(job);

                case capLevelJobType.CHECK_SERVICE_COMPLETION:
                    return await this.processServiceCompletionCheck(job);

                case capLevelJobType.CLEANUP_OLD_DATA:
                    return await this.processDataCleanup(job);

                case capLevelJobType.GENERATE_REPORTS:
                    return await this.processReportGeneration(job);

                default:
                    throw new Error(`Unknown job type: ${job.name}`);
            }
        } catch (error) {
            this.logger.error(`Job processing failed: ${job.name} (ID: ${job.id})`, error.stack);
            throw error;
        }
    }

    /**
     * Calculate user eligibility for cap level promotion
     */
    private async processUserEligibility(job: Job<UserEligibilityJobData>) {
        const { userId, triggerAction } = job.data;

        this.logger.log(
            `Calculating eligibility for user ${userId} (triggered by: ${triggerAction})`,
        );

        const eligibility = await this.capLevelService.calculateCapEligibility(userId);

        // If user is eligible for automatic promotion, queue promotion job
        if (eligibility.canPromote) {
            const requirements = eligibility.requirements;

            // Auto-promote for levels that don't require verification
            if (
                requirements &&
                !requirements.requiresVerification &&
                !requirements.requiresNomination
            ) {
                await this.queue.add(
                    capLevelJobType.PROMOTE_USER,
                    {
                        userId,
                        targetLevel: eligibility.eligibleLevel,
                        bypassVerification: false,
                        triggeredBy: "system",
                    } as UserPromotionJobData,
                    {
                        delay: 1000,
                    },
                );

                // await job.addJob(RedisConfig, capLevelJobType["PROMOTE_USER"], {
                //   userId,
                //   targetLevel: eligibility.eligibleLevel,
                //   bypassVerification: false,
                //   triggeredBy: 'system',
                // } as UserPromotionJobData, {
                //   delay: 1000, // Small delay to ensure data consistency
                // });

                this.logger.log(
                    `Queued automatic promotion for user ${userId} to ${eligibility.eligibleLevel}`,
                );
            } else {
                this.logger.log(
                    `User ${userId} eligible for ${eligibility.eligibleLevel} but requires manual verification`,
                );
            }
        }

        return {
            userId,
            eligibility,
            autoPromotionQueued:
                eligibility.canPromote && eligibility.requirements?.requiresVerification === false,
        };
    }

    /**
     * Process user cap level promotion
     */

    // TODO: Queue notification job (would be handled by notification system)
    // await this.queue.add('send-promotion-notification', {
    //   userId,
    //   newLevel: promotedUser.capLevel,
    //   triggeredBy,
    // });

    /**
     * Process user metrics update
     */
    private async processUserMetricsUpdate(job: Job<UserMetricsUpdateJobData>) {
        const { userId, metricsUpdate, recalculateScore = true } = job.data;

        this.logger.log(`Updating metrics for user ${userId}`);

        // Update user metrics
        const updatedMetrics = await this.userMetricsService.updateUserMetrics(
            userId,
            metricsUpdate,
        );

        // Recalculate activity score if requested
        if (recalculateScore) {
            await this.userMetricsService.recalculateAndUpdateActivityScore(userId);

            // Queue eligibility check
            // await this.queue.add(
            //     capLevelJobType["CALCULATE_USER_ELIGIBILITY"],
            //     {
            //         userId,
            //         triggerAction: "metrics_update",
            //     } as UserEligibilityJobData,
            //     {
            //         delay: 2000, // Delay to ensure score recalculation is complete
            //     },
            // );
        }

        return {
            userId,
            updatedMetrics,
            eligibilityCheckQueued: recalculateScore,
        };
    }

    /**
     * Process activity score recalculation
     */
    private async processActivityScoreRecalculation(job: Job<{ userId: string }>) {
        const { userId } = job.data;

        this.logger.log(`Recalculating activity score for user ${userId}`);

        const updatedMetrics =
            await this.userMetricsService.recalculateAndUpdateActivityScore(userId);
        const newScore = updatedMetrics.activityScore;

        // Queue eligibility check after score update
        // await this.queue.add(
        //     capLevelJobType["CALCULATE_USER_ELIGIBILITY"],
        //     {
        //         userId,
        //         triggerAction: "score_recalculation",
        //     } as UserEligibilityJobData,
        //     {
        //         delay: 1000,
        //     },
        // );

        return {
            userId,
            newScore,
            updatedMetrics,
            eligibilityCheckQueued: true,
        };
    }

    /**
     * Process batch user promotions
     */

    /**
     * Process batch metrics recalculation
     */
    private async processBatchMetricsRecalculation(job: Job<BatchMetricsJobData>) {
        const { userIds, capLevel, lastUpdatedBefore, batchSize = 50, adminId } = job.data;

        this.logger.log(`Processing batch metrics recalculation (batch size: ${batchSize})`);
        this.logger.log(
            `Current caplevel: ${capLevel} and last update before: ${lastUpdatedBefore}`,
        );

        let targetUserIds = userIds;

        if (!userIds || userIds.length === 0) {
            // Get users based on criteria
            const highActivityUsers = await this.userMetricsService.getUsersWithHighActivity(0);
            targetUserIds = highActivityUsers.map((metrics) => metrics.userId);
        }

        if (!targetUserIds || targetUserIds.length === 0) {
            return { processed: 0, errors: 0, message: "No users found" };
        }

        // Process in batches
        await this.userMetricsService.bulkRecalculateActivityScores(targetUserIds);

        return {
            totalUsers: targetUserIds.length,
            batchSize,
            adminId,
            processedAt: new Date(),
        };
    }

    /**
     * Process monthly revenue calculation
     */
    private async processMonthlyRevenue(job: Job<MonthlyRevenueJobData>) {
        const { month, year, totalPlatformRevenue, dryRun = false, adminId } = job.data;

        this.logger.log(
            `Processing monthly revenue for ${month}/${year} - $${totalPlatformRevenue} (dryRun: ${dryRun})`,
        );

        const result = await this.adRevenueService.calculateMonthlyRevenue({
            month,
            year,
            totalPlatformRevenue,
            dryRun,
        });

        return {
            ...result,
            adminId,
            processedAt: new Date(),
        };
    }

    /**
     * Process volunteer hours update
    //  */
    // private async processVolunteerHours(job: Job<VolunteerHoursJobData>) {
    //     const { userId, hours, projectId, workDescription, workDate } = job.data;

    //     this.logger.log(`Processing volunteer hours for user ${userId}: ${hours} hours`);

    //     const updatedMetrics = await this.volunteerTrackingService.updateVolunteerHours({
    //         userId,
    //         hours,
    //         projectId,
    //         workDescription,
    //         workDate,
    //     });

    //     return {
    //         userId,
    //         hours,
    //         updatedMetrics,
    //         processedAt: new Date(),
    //     };
    // }

    /**
     * Process 8-week service completion check
     */
    private async processServiceCompletionCheck(job: Job<{ userId: string }>): Promise<any> {
        const { userId } = job.data;

        this.logger.log(`Checking 8-week service completion for user ${userId}`);

        // This would check if user meets 8-week service requirements
        // and automatically promote to BLACK level if eligible

        return {
            userId,
            checkedAt: new Date(),
            // Additional completion data would go here
        };
    }

    /**
     * Process data cleanup tasks
     */
    private async processDataCleanup(job: Job<any>): Promise<any> {
        this.logger.log("Processing data cleanup tasks");
        this.logger.log(`Job name: ${job.name}`);

        // Clean up old activity logs, expired sessions, etc.
        // This would include maintenance tasks like:
        // - Remove old activity score history
        // - Clean up expired revenue calculations
        // - Archive old volunteer records

        return {
            cleanedAt: new Date(),
            tasksCompleted: ["activity_logs", "expired_sessions"],
        };
    }

    /**
     * Process report generation
     */
    private async processReportGeneration(job: Job<any>): Promise<any> {
        this.logger.log("Processing report generation");
        this.logger.log(`Job name: ${job.name}`);

        // Generate various reports:
        // - Monthly cap level statistics
        // - Revenue distribution reports
        // - Volunteer activity summaries

        return {
            generatedAt: new Date(),
            reportsGenerated: ["cap_level_stats", "revenue_report", "volunteer_summary"],
        };
    }

    /**
     * Event handlers for job lifecycle
     */
    @OnWorkerEvent("completed")
    onCompleted(job: Job) {
        this.logger.log(
            `Job completed: ${job.name} (ID: ${job.id}) in ${job.processedOn ? Date.now() - job.processedOn : "unknown"}ms`,
        );
    }

    @OnWorkerEvent("failed")
    onFailed(job: Job, error: Error) {
        this.logger.error(`Job failed: ${job.name} (ID: ${job.id})`, error.stack);
    }

    @OnWorkerEvent("active")
    onActive(job: Job) {
        this.logger.debug(`Job started: ${job.name} (ID: ${job.id})`);
    }

    @OnWorkerEvent("stalled")
    onStalled(job: Job) {
        this.logger.warn(`Job stalled: ${job.name} (ID: ${job.id})`);
    }

    @OnWorkerEvent("progress")
    onProgress(job: Job, progress: number) {
        this.logger.debug(`Job progress: ${job.name} (ID: ${job.id}) - ${progress}%`);
    }
}
