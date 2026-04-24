import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { UserRepository } from "@module/(users)/users/users.repository";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Queue } from "bullmq";
import { capLevelJobType } from "../constants";

@Injectable()
export class CapLevelCronJobService {
    private readonly logger = new Logger(CapLevelCronJobService.name);

    constructor(
        @InjectQueue(QUEUE_JOB_NAME.CAP_LEVEL.CAP_LEVEL_QUEUE_NAME) private capLevelQueue: Queue,
        private readonly repo: UserRepository,
    ) {}

    // @Cron(CronExpression.EVERY_MINUTE)

    @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
    async scheduleJob() {
        this.logger.log(
            `Running cap level job scheduler for ${capLevelJobType.CALCULATE_USER_ELIGIBILITY}`,
        );

        const users = await this.repo.finds();

        // call your queue from here...
        this.capLevelQueue.add(capLevelJobType.CALCULATE_USER_ELIGIBILITY, {
            userArray: users,
            // TODO: pass your all required data from here that you will receive to your processor based on the queue name you'll get the every single block into the switch case
        });
        this.capLevelQueue.add(capLevelJobType.BATCH_PROMOTE_USERS, {
            message: "hello",
            // TODO: pass your all required data from here that you will receive to your processor based on the queue name you'll get the every single block into the switch case
        });
    }
    // TODO: Write here your another job for diff shedule time as like the same format
}
