import { GetUser, ValidateAuth } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { ImpactExportQueryDto } from "./dto/impact-export.dto";
import { ImpactExportService } from "./impact-export.service";

@ApiTags("Impact data export")
@Controller("impact/export")
export class ImpactExportController {
    constructor(private readonly impactExportService: ImpactExportService) {}

    @Get("summary")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Anonymised platform impact summary",
        description:
            "Aggregated verified hours and activity totals for NGOs, agencies, or Growth+ corporate subscribers. No individual member data.",
    })
    async summary(
        @GetUser("userId") userId: string,
        @GetUser("role") role: Role,
        @Query() query: ImpactExportQueryDto,
    ) {
        const data = await this.impactExportService.getSummary(userId, role, query);
        return successResponse(data, "Anonymised impact summary exported");
    }

    @Get("breakdown")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Anonymised impact breakdown export",
        description:
            "k-anonymised buckets by contribution type, Cap level, coarse region, month, and SDG alignment counts.",
    })
    async breakdown(
        @GetUser("userId") userId: string,
        @GetUser("role") role: Role,
        @Query() query: ImpactExportQueryDto,
    ) {
        const data = await this.impactExportService.getBreakdown(userId, role, query);
        return successResponse(data, "Anonymised impact breakdown exported");
    }
}
