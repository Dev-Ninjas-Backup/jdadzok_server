import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { FraudModule } from "@module/(abuse)/fraud/fraud.module";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { WithdrawController } from "./withdraw.controller";
import { WithdrawCron } from "./withdraw.cron";
import { WithdrawProcessor } from "./withdraw.processor";
import { WithdrawService } from "./withdraw.service";

@Module({
    imports: [
        FraudModule,
        BullModule.registerQueue({
            name: QUEUE_JOB_NAME.WITHDRAW.WITHDRAW_QUEUE,
        }),
    ],
    controllers: [WithdrawController],
    providers: [WithdrawProcessor, WithdrawCron, WithdrawService],
})
export class WithdrawModule {}
