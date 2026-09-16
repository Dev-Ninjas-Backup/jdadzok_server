import { Controller, ForbiddenException, Get, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { IncomeAnalyticService } from "../service/incomeAnalytic.service";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/shared.types";

@ApiTags("Income & Analytic")
@Controller("income-analytic")
export class IncomeAnalyticController {
    constructor(private readonly incomeAnalyticService: IncomeAnalyticService) {}

    @ApiOperation({ summary: "Super Admin: Get Income & Analytic overview statistics" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("overview")
    async getOverview(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbidden access");
        return this.incomeAnalyticService.getOverview();
    }

    @ApiOperation({ summary: "Super Admin: Get Income & Analytic Revenue Growth" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("revenue-growth")
    async getRevenueGrowth(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbidden access");
        return this.incomeAnalyticService.getRevenueGrowth();
    }

    @ApiOperation({ summary: "Super Admin: Export revenue growth (last 6 months) as CSV" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("revenue-growth/export")
    async exportRevenueGrowth(@GetVerifiedUser() user: VerifiedUser, @Res() res: Response) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbidden access");
        const csv = await this.incomeAnalyticService.exportRevenueGrowth();
        res.set({
            "Content-Type": "text/csv",
            "Content-Disposition": 'attachment; filename="revenue-growth.csv"',
        });
        res.send(csv);
    }

    @ApiOperation({ summary: "Super Admin: Get Income & Analytic Revenue Category" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("revenue-category")
    async getRevenueCategory(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbidden access");
        return this.incomeAnalyticService.getRevenueCategory();
    }

    @ApiOperation({ summary: "Super Admin: Get Income & Analytic Top Seller" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("top-sellers")
    async getTopSellers(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbidden access");
        return this.incomeAnalyticService.getTopSellers();
    }
}
