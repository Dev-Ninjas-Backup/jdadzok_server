import { Injectable } from "@nestjs/common";
import { WithdrawService } from "./withdraw.service";

@Injectable()
export class WithdrawCron {
    constructor(private withdrawService: WithdrawService) {}

    // @Cron("0 0 0 15 * *") // প্রতি মাসের 15 তারিখ রাত 12AM
    // async autoWithdraw() {
    //     await this.withdrawService.enqueueMonthlyWithdraws();
    // }

    // Optional test method for cron with 1-minute delay
    async testAutoWithdraw() {
        await this.withdrawService.enqueueMonthlyWithdraws({ testDelayMs: 60000 }); // 1 min
    }
}
