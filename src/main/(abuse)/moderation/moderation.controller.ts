import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ModerationDecision } from "@prisma/client";
import { GetVerifiedUser, ValidateAdmin } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { VerifiedUser } from "@type/shared.types";
import { ModerationService } from "./moderation.service";

@ApiTags("Abuse / Moderation")
@ApiBearerAuth()
@ValidateAdmin()
@Controller("abuse/moderation")
export class ModerationController {
    constructor(private readonly moderationService: ModerationService) {}

    @Get("status")
    @ApiOperation({ summary: "Content-moderation vendor status (feature flag, thresholds)" })
    status() {
        return successResponse(this.moderationService.status(), "Moderation status");
    }

    @Get("checks")
    @ApiOperation({ summary: "List moderation checks (admin review queue)" })
    async listChecks(
        @Query("decision") decision?: ModerationDecision,
        @Query("page") page?: string,
        @Query("limit") limit?: string,
    ) {
        const data = await this.moderationService.listChecks({
            decision,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
        return successResponse(data, "Moderation checks");
    }

    @Post("checks/:id/approve")
    @ApiOperation({ summary: "Approve a held post: it becomes visible" })
    async approve(@Param("id") id: string, @GetVerifiedUser() admin: VerifiedUser) {
        const data = await this.moderationService.approve(id, admin.id);
        return successResponse(data, "Held post approved");
    }

    @Post("checks/:id/reject")
    @ApiOperation({ summary: "Reject a held post: it stays hidden" })
    async reject(@Param("id") id: string, @GetVerifiedUser() admin: VerifiedUser) {
        const data = await this.moderationService.reject(id, admin.id);
        return successResponse(data, "Held post rejected");
    }
}
