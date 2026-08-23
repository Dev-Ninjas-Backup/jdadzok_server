import { GetUser, MakePublic, ValidateAdmin, ValidateAuth } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { SponsoredOpportunityService } from "./sponsored-opportunity.service";
import {
    CreateSponsoredOpportunityDto,
    SponsoredDiscoverQueryDto,
} from "./dto/sponsored-opportunity.dto";

@ApiTags("Sponsored opportunities")
@Controller("sponsored")
export class SponsoredController {
    constructor(private readonly sponsoredService: SponsoredOpportunityService) {}

    @Get("opportunities")
    @MakePublic()
    @ApiOperation({
        summary: "Discover actively sponsored volunteer projects and Bridge listings",
        description: "Separate from Product↔Post DedicatedAd — corporate CSR sponsorships.",
    })
    async discover(@Query() query: SponsoredDiscoverQueryDto) {
        const data = await this.sponsoredService.discoverActive(query.targetType);
        return successResponse(data, "Sponsored opportunities retrieved");
    }

    @Get("opportunities/:id")
    @MakePublic()
    @ApiOperation({ summary: "Sponsored opportunity detail" })
    async getOne(@Param("id") id: string) {
        const data = await this.sponsoredService.getById(id);
        return successResponse(data, "Sponsored opportunity retrieved");
    }
}
