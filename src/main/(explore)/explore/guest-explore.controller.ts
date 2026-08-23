import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { MakePublic } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { GuestExploreService } from "./guest-explore.service";
import { GuestExploreQueryDto } from "./dto/guest-explore.dto";

@ApiTags("Explore — Guest")
@Controller("explore/guest")
@MakePublic()
export class GuestExploreController {
    constructor(private readonly guestExploreService: GuestExploreService) {}

    @Get("contract")
    @ApiOperation({
        summary: "Guest explore API contract",
        description:
            "Documents public browse routes and identity actions that require sign-in (apply, connect, message, book, etc.).",
    })
    getContract() {
        return successResponse(
            this.guestExploreService.getContract(),
            "Guest explore contract retrieved",
        );
    }

    @Get()
    @ApiOperation({
        summary: "Guest home feed",
        description:
            "Unauthenticated browse of opportunities, Bridge preview, NGOs, communities, and impact snapshot.",
    })
    async getGuestHome(@Query() query: GuestExploreQueryDto) {
        const data = await this.guestExploreService.getGuestHome(query);
        return successResponse(data, "Guest explore home retrieved");
    }

    @Get("opportunities")
    @ApiOperation({ summary: "Browse active volunteer projects (guest-safe fields only)" })
    async listOpportunities(@Query() query: GuestExploreQueryDto) {
        const data = await this.guestExploreService.listOpportunities(query);
        return successResponse(data, "Guest volunteer opportunities retrieved");
    }

    @Get("opportunities/:projectId")
    @ApiOperation({ summary: "Volunteer project detail for guests" })
    async getOpportunity(@Param("projectId") projectId: string) {
        const data = await this.guestExploreService.getOpportunityDetail(projectId);
        return successResponse(data, "Guest volunteer opportunity retrieved");
    }

    @Get("impact")
    @ApiOperation({
        summary: "Platform impact snapshot",
        description: "Aggregated verified hours and opportunity counts — no private member data.",
    })
    async getImpact() {
        const data = await this.guestExploreService.getImpactSnapshot();
        return successResponse(data, "Guest impact snapshot retrieved");
    }
}
