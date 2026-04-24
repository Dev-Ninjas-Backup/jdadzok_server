import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    Param,
    Patch,
    Query,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DashboardService } from "../service/dashboard.service";
import { PrismaService } from "@lib/prisma/prisma.service";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/shared.types";
import { UpdateReportDto } from "@module/(users)/report/dto/report.dto";
import { handleRequest } from "@common/utils/handle.request.util";
import { ReportQueryDto } from "../dto/report.dto";

@ApiTags("Admin Dashboard")
@Controller("admin/dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(
        private readonly dashboardService: DashboardService,
        private readonly prisma: PrismaService,
    ) {}

    @ApiOperation({ summary: "Super Admin: Get dashboard summary overview" })
    @Get("summary")
    async getSummary(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") {
            throw new ForbiddenException("Forbidden access");
        }
        return this.dashboardService.getSummary();
    }

    @ApiOperation({ summary: "Super Admin: Get user growth for last 6 months" })
    @Get("user-growth")
    async getUserGrowth(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") {
            throw new ForbiddenException("Forbidden access");
        }
        return this.dashboardService.getUserGrowth();
    }

    @ApiOperation({ summary: "Super Admin: Get revenue trends for last 6 months" })
    @Get("revenue-trends")
    async getRevenueTrends(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") {
            throw new ForbiddenException("Forbidden access");
        }
        return this.dashboardService.getRevenueTrends();
    }

    @ApiOperation({ summary: "Super Admin: Get activity division breakdown" })
    @Get("activity-division")
    async getActivityDivision(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") {
            throw new ForbiddenException("Forbidden access");
        }
        return this.dashboardService.getActivityDivision();
    }

    @ApiOperation({ summary: "Super Admin: Get pending application counts" })
    @Get("pending-applications")
    async getPendingApplicationsDetailed(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") {
            throw new ForbiddenException("Forbidden access");
        }
        return this.dashboardService.getPendingApplicationsDetailed();
    }

    @Get("/report")
    @ApiOperation({ summary: "Get all pending reports (admin only)" })
    async getPendingReports(@GetVerifiedUser() user: any, @Query() query: ReportQueryDto) {
        if (user.role !== "SUPER_ADMIN") {
            throw new ForbiddenException("Forbidden access");
        }

        return handleRequest(
            () => this.dashboardService.getPendingReports(query),
            "Reports loaded successfully",
        );
    }

    @Patch("/:id/review")
    @ApiOperation({ summary: "Review report and update status (admin only)" })
    async reviewReport(
        @Param("id") reportId: string,
        @Body() dto: UpdateReportDto,
        @GetVerifiedUser() user: any,
    ) {
        if (user.role !== "SUPER_ADMIN") {
            throw new ForbiddenException("Forbidden access");
        }
        return handleRequest(
            () => this.dashboardService.reviewReport(reportId, dto, user.id),
            "Report reviewed successfully",
        );
    }
}
