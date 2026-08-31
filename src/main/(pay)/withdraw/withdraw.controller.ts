import { successPaginatedResponse, successResponse } from "@common/utils/response.util";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { Controller, Get, Post, Query, UseGuards, Body } from "@nestjs/common";

import { CreateWithdrawDto } from "./dto/create-withdraw.dto";
import { WithdrawService } from "./withdraw.service";
import { VerifiedUser } from "@type/shared.types";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { WithdrawQueryDto } from "./dto/withdraw-query.dto";

@Controller("withdraw")
export class WithdrawController {
    constructor(private readonly withdrawService: WithdrawService) {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get()
    @ApiOperation({ summary: "Get payout / withdraw history for current user" })
    async history(@GetVerifiedUser() user: VerifiedUser, @Query() query: WithdrawQueryDto) {
        const result = await this.withdrawService.getHistory(user.id, query);
        return successPaginatedResponse(result.data, result.metadata, "Withdraw history retrieved");
    }

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
