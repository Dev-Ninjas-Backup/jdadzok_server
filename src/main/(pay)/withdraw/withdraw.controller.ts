import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { CreateWithdrawDto } from "./dto/create-withdraw.dto";
import { WithdrawService } from "./withdraw.service";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/shared.types";
import { ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";

@Controller("withdraw")
export class WithdrawController {
    constructor(private readonly withdrawService: WithdrawService) {}

    // @ApiBearerAuth()
    // @UseGuards(JwtAuthGuard)
    // @Post("request")
    // async request(@GetVerifiedUser() user: VerifiedUser, @Body() dto: CreateWithdrawDto) {
    //     return this.withdrawService.requestWithdraw(user.id, dto);
    // }

    // Test withdraw with 1-minute delay
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post("request-test")
    async requestTest(@GetVerifiedUser() user: VerifiedUser, @Body() dto: CreateWithdrawDto) {
        return this.withdrawService.requestWithdraw(user.id, dto, { delayMs: 60000 });
    }

    @Post("schedule")
    async runScheduler() {
        return this.withdrawService.enqueueMonthlyWithdraws();
    }
}
