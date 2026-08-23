import { GetUser, ValidateAdmin, ValidateAuth } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CapLevelPromotionService } from "./cap-level-promotion.service";
import { CapLevelService } from "./cap-lavel.service";
import { PromoteUserDto } from "./dto/cap-leve.dto";

@ApiBearerAuth()
@ApiTags("Cap Level Management")
@Controller("cap-level")
@UseGuards(JwtAuthGuard)
export class CapLevelController {
    constructor(
        private readonly service: CapLevelService,
        private readonly promotionService: CapLevelPromotionService,
    ) {}

    @Get("status/me")
    @ValidateAuth()
    @ApiOperation({ summary: "Get my Cap ladder status, eligibility, and earning info" })
    async getMyStatus(@GetUser("userId") userId: string): Promise<ReturnType<typeof successResponse>> {
        const data = await this.promotionService.getMyCapStatus(userId);
        return successResponse(data, "Cap status retrieved");
    }

    @Get("status/:userId")
    @ValidateAdmin()
    @ApiOperation({ summary: "Get a member Cap status (admin)" })
    async getUserStatus(@Param("userId") userId: string): Promise<ReturnType<typeof successResponse>> {
        const data = await this.promotionService.getMyCapStatus(userId);
        return successResponse(data, "Cap status retrieved");
    }

    @Get("pending-black-review")
    @ValidateAdmin()
    @ApiOperation({
        summary:
            "List Red Cap members who meet Black verified-hours threshold — awaiting admin promotion",
    })
    async listPendingBlackReview() {
        const data = await this.promotionService.listPendingBlackReview();
        return successResponse(data, "Pending Black Cap review queue retrieved");
    }

    @Get("audit/:userId")
    @ValidateAdmin()
    @ApiOperation({ summary: "Cap promotion audit trail for a member" })
    async listAudit(@Param("userId") userId: string) {
        const data = await this.promotionService.listPromotionAudit(userId);
        return successResponse(data, "Cap promotion audit retrieved");
    }

    @Put("promote/:userId")
    @ValidateAdmin()
    @ApiOperation({
        summary:
            "Admin promote one Cap rung (Red→Black requires verified hours + explicit review). bypassVerification requires bypassReason.",
    })
    async promoteUser(
        @Param("userId") userId: string,
        @Body() dto: PromoteUserDto,
        @GetUser("userId") actorId: string,
        @GetUser("role") actorRole: Role,
    ) {
        const data = await this.promotionService.promoteUser(actorId, userId, dto, actorRole);
        return successResponse(data, "Cap level updated");
    }
}
