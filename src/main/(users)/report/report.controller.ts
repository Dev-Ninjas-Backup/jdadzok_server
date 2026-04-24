import { Controller, Post, Body, Get, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ReportService } from "./report.service";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { handleRequest } from "@common/utils/handle.request.util";
import { CreateReportDto } from "./dto/report.dto";

@ApiTags("Reports")
@Controller("reports")
export class ReportController {
    constructor(private service: ReportService) {}
    @Post()
    @ApiOperation({ summary: "Submit a report for USER, POST, PRODUCT, COMMENT" })
    async createReport(@GetVerifiedUser() user: any, @Body() dto: CreateReportDto) {
        if (user.role === "SUPER_ADMIN") {
            throw new ForbiddenException("Forbidden access only user can report.");
        }
        return handleRequest(
            () => this.service.createReport(user.id, dto),
            "Report submitted successfully",
        );
    }

    @Get("/my-reports")
    @ApiOperation({ summary: "Get all reports submitted by the current user" })
    async getMyReports(@GetVerifiedUser() user: any) {
        return handleRequest(() => this.service.getReportsByUser(user.id), "Your reports loaded");
    }
}
