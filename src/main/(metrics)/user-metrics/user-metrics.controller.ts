import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { UserMetricsService } from "./user-metrics.service";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/shared.types";
import { UserMetricsFilterDto } from "./dto/update-user-metrics.dto";
import { sanitizeUserMetricsForViewer } from "@common/utils/soft-earnings.util";

@ApiBearerAuth()
@ApiTags("User Metrics")
@Controller("user-metrics")
export class UserMetricsController {
    constructor(private readonly service: UserMetricsService) {}

    @ApiOperation({ summary: "Get logged-in user metrics (with filter)" })
    @ApiResponse({ status: 200 })
    @Get()
    async getUserMetrics(
        @GetVerifiedUser() user: VerifiedUser,
        @Query() filter: UserMetricsFilterDto,
    ) {
        return this.service.getUserMetrics(user.id, filter);
    }

    @ApiOperation({ summary: "Get another user metrics by ID (earnings stripped — soft headlines only)" })
    @ApiResponse({ status: 200 })
    @Get(":userId")
    async getUserMetricsById(
        @GetVerifiedUser() viewer: VerifiedUser,
        @Param("userId") userId: string,
        @Query() filter: UserMetricsFilterDto,
    ) {
        const metrics = await this.service.getUserMetrics(userId, filter);
        return sanitizeUserMetricsForViewer(
            metrics,
            viewer.id,
            userId,
            metrics.user?.capLevel,
        );
    }
}
