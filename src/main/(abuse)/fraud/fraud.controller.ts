import { Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { FraudDecision } from "@prisma/client";
import { GetVerifiedUser, MakePublic, ValidateAdmin } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { VerifiedUser } from "@type/shared.types";
import { FraudService } from "./fraud.service";

@ApiTags("Abuse / Fraud")
@Controller("abuse/fraud")
export class FraudController {
    constructor(private readonly fraudService: FraudService) {}

    @Get("status")
    @MakePublic()
    @ApiOperation({ summary: "Account-fraud vendor status (feature flag)" })
    status() {
        return successResponse(this.fraudService.status(), "Fraud status");
    }

    @Get("checks")
    @ApiBearerAuth()
    @ValidateAdmin()
    @ApiOperation({ summary: "List fraud vendor checks (admin review queue)" })
    async listChecks(
        @Query("decision") decision?: FraudDecision,
        @Query("page") page?: string,
        @Query("limit") limit?: string,
    ) {
        const data = await this.fraudService.listChecks({
            decision,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
        return successResponse(data, "Fraud checks");
    }

    @Post("checks/:id/clear")
    @ApiBearerAuth()
    @ValidateAdmin()
    @ApiOperation({
        summary: "Admin override — mark a fraud check as reviewed/cleared",
    })
    async clearCheck(@Param("id") id: string, @GetVerifiedUser() admin: VerifiedUser) {
        const data = await this.fraudService.clearCheck(id, admin.id);
        return successResponse(data, "Fraud check cleared");
    }
}
