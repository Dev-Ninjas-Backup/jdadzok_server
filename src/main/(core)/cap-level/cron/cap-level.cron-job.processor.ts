import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
// import { User } from "@prisma/client";
import { Job } from "bullmq";
import { capLevelJobType } from "../constants";
import { CapLevelProcessorService } from "./cap-level.processor.service";

@Processor(QUEUE_JOB_NAME.CAP_LEVEL.CAP_LEVEL_QUEUE_NAME)
export class CapLevelCronJobProcessor extends WorkerHost {
    private readonly logger = new Logger(CapLevelCronJobProcessor.name);

    constructor(private readonly processorService: CapLevelProcessorService) {
        super();
        this.logger.log("Cap Level Processor initialized");
    }

    async process(job: Job): Promise<any> {
        try {
            if (job.queueName === QUEUE_JOB_NAME.CAP_LEVEL.CAP_LEVEL_QUEUE_NAME) {
                switch (job.name) {
                    case capLevelJobType.CALCULATE_USER_ELIGIBILITY:
                        // call your user eligibility service from here...

                        return await this.processorService.handleUserCaplevelCheckingAndDedicatedToUserusers(
                            job.data.userArray,
                        );

                    case capLevelJobType.BATCH_PROMOTE_USERS:
                        console.info(job.name);
                    // example of calling your processor service
                    // return await this.processorService.processBatchPromotion(job);
                }
            }
        } catch (err: any) {
            this.logger.error(`Job processing failed: ${job.name}`, err.stack);
        }
    }

    @OnWorkerEvent("completed")
    onCompleted(job: Job) {
        this.logger.log(
            `Job completed: ${job.name} in ${job.processedOn ? Date.now() - job.processedOn : "unknown"}ms`,
        );
    }

    @OnWorkerEvent("failed")
    onFailed(job: Job, error: Error) {
        this.logger.error(`Job failed: ${job.name}`, error.stack);
    }

    @OnWorkerEvent("active")
    onActive(job: Job) {
        this.logger.debug(`Job started: ${job.name}`);
    }

    @OnWorkerEvent("stalled")
    onStalled(job: Job) {
        this.logger.warn(`Job stalled: ${job.name}`);
    }

    @OnWorkerEvent("progress")
    onProgress(job: Job, progress: number) {
        this.logger.debug(`Job progress: ${job.name} - ${progress}%`);
    }
}
