import { GetUser, MakePublic, ValidateAdmin, ValidateAuth } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CorporateService } from "./corporate.service";
import {
    CreateCorporateMembershipDto,
    UpdateCorporateEsgReportDto,
    UpdateCorporateMembershipDto,
} from "./dto/corporate-membership.dto";

@ApiTags("Corporate CSR")
@Controller("corporate")
export class CorporateController {
    constructor(private readonly corporateService: CorporateService) {}

    @Get("tiers")
    @MakePublic()
    @ApiOperation({
        summary: "Corporate membership tier catalog",
        description: "June 26 tiers: Starter / Growth / Enterprise (maps from legacy Silver / Gold / Platinum).",
    })
    listTiers() {
        return successResponse(this.corporateService.listTiers(), "Corporate tiers retrieved");
    }

    @Get("memberships/me")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "CSR dashboard — my organisation membership + ESG fields" })
    async getMyMembership(@GetUser("userId") userId: string) {
        const data = await this.corporateService.getMyMembership(userId);
        return successResponse(data, "Corporate membership retrieved");
    }

    @Get("memberships")
    @ValidateAdmin()
    @ApiBearerAuth()
    @ApiOperation({ summary: "List all corporate memberships (admin)" })
    async listMemberships() {
        const data = await this.corporateService.listMemberships();
        return successResponse(data, "Corporate memberships retrieved");
    }

    @Get("memberships/:id")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get corporate membership by id" })
    async getMembership(@Param("id") id: string) {
        const data = await this.corporateService.getMembership(id);
        return successResponse(data, "Corporate membership retrieved");
    }

    @Post("memberships")
    @ValidateAdmin()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Create corporate membership (admin)" })
    async createMembership(@Body() dto: CreateCorporateMembershipDto) {
        const data = await this.corporateService.createMembership(dto);
        return successResponse(data, "Corporate membership created");
    }

    @Patch("memberships/:id")
    @ValidateAdmin()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Update corporate membership tier or contact (admin)" })
    async updateMembership(@Param("id") id: string, @Body() dto: UpdateCorporateMembershipDto) {
        const data = await this.corporateService.updateMembership(id, dto);
        return successResponse(data, "Corporate membership updated");
    }

    @Patch("memberships/:id/esg-report")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Submit or update SDG / ESG impact report",
        description:
            "Corporate contact or admin. Growth/Enterprise tiers include ESG reporting; Starter tracks usage only.",
    })
    async updateEsgReport(
        @Param("id") id: string,
        @GetUser("userId") userId: string,
        @GetUser("role") role: Role,
        @Body() dto: UpdateCorporateEsgReportDto,
    ) {
        const isAdmin = role === Role.ADMIN || role === Role.SUPER_ADMIN;
        const data = await this.corporateService.updateEsgReport(id, userId, dto, isAdmin);
        return successResponse(data, "ESG report updated");
    }
}
