import { GetUser, ValidateAdmin, ValidateAuth } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkyBlueNominationStatus } from "@prisma/client";
import {
    NominateSkyBlueDto,
    SkyBlueDecisionDto,
    SkyBlueVerificationDto,
} from "./dto/sky-blue-nomination.dto";
import { SkyBlueNominationService } from "./sky-blue-nomination.service";

@ApiBearerAuth()
@ApiTags("Sky Blue Nomination")
@Controller("cap-level/sky-blue")
export class SkyBlueNominationController {
    constructor(private readonly service: SkyBlueNominationService) {}

    @Get("me")
    @ValidateAuth()
    @ApiOperation({ summary: "View my Sky Blue nomination / invitation status" })
    async getMine(@GetUser("userId") userId: string) {
        const data = await this.service.getMine(userId);
        return successResponse(data, "Sky Blue nomination status retrieved");
    }

    @Post("apply")
    @ValidateAuth()
    @ApiOperation({ summary: "Blocked — Sky Blue is invitation-only (never applied for)" })
    async apply(@GetUser("userId") userId: string) {
        return this.service.assertCannotSelfApply(userId);
    }

    @Get()
    @ValidateAdmin()
    @ApiOperation({ summary: "List Sky Blue nominations (admin / committee)" })
    async list(@Query("status") status?: SkyBlueNominationStatus) {
        const data = await this.service.list(status);
        return successResponse(data, "Sky Blue nominations retrieved");
    }

    @Get(":id")
    @ValidateAdmin()
    @ApiOperation({ summary: "Get Sky Blue nomination with audit trail" })
    async getById(@Param("id") id: string) {
        const data = await this.service.getById(id);
        return successResponse(data, "Sky Blue nomination retrieved");
    }

    @Post("nominate")
    @ValidateAdmin()
    @ApiOperation({ summary: "Invite / nominate a member onto the Sky Blue track" })
    async nominate(@GetUser("userId") actorId: string, @Body() dto: NominateSkyBlueDto) {
        const data = await this.service.nominate(actorId, dto);
        return successResponse(data, "Sky Blue nomination created");
    }

    @Patch(":id/kyc")
    @ValidateAdmin()
    @ApiOperation({ summary: "Record KYC verification on a Sky Blue nomination" })
    async verifyKyc(
        @Param("id") id: string,
        @GetUser("userId") actorId: string,
        @Body() dto: SkyBlueVerificationDto,
    ) {
        const data = await this.service.verifyKyc(id, actorId, dto);
        return successResponse(data, "KYC verification recorded");
    }

    @Patch(":id/notability")
    @ValidateAdmin()
    @ApiOperation({ summary: "Record notability verification on a Sky Blue nomination" })
    async verifyNotability(
        @Param("id") id: string,
        @GetUser("userId") actorId: string,
        @Body() dto: SkyBlueVerificationDto,
    ) {
        const data = await this.service.verifyNotability(id, actorId, dto);
        return successResponse(data, "Notability verification recorded");
    }

    @Patch(":id/approve")
    @ValidateAdmin()
    @ApiOperation({ summary: "Approve Sky Blue after KYC + notability (grants CapLevel.SKY_BLUE)" })
    async approve(
        @Param("id") id: string,
        @GetUser("userId") actorId: string,
        @Body() dto: SkyBlueDecisionDto,
    ) {
        const data = await this.service.approve(id, actorId, dto);
        return successResponse(data, "Sky Blue approved and granted");
    }

    @Patch(":id/reject")
    @ValidateAdmin()
    @ApiOperation({ summary: "Reject a Sky Blue nomination" })
    async reject(
        @Param("id") id: string,
        @GetUser("userId") actorId: string,
        @Body() dto: SkyBlueDecisionDto,
    ) {
        const data = await this.service.reject(id, actorId, dto);
        return successResponse(data, "Sky Blue nomination rejected");
    }

    @Patch(":id/revoke")
    @ValidateAdmin()
    @ApiOperation({ summary: "Revoke an approved Sky Blue grant (demotes to BLACK)" })
    async revoke(
        @Param("id") id: string,
        @GetUser("userId") actorId: string,
        @Body() dto: SkyBlueDecisionDto,
    ) {
        const data = await this.service.revoke(id, actorId, dto);
        return successResponse(data, "Sky Blue revoked");
    }
}
