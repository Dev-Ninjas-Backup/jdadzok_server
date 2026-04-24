import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ExploreService } from "./explore.service";
import { ExploreDto } from "./dto/explore.dto";
import { handleRequest } from "@common/utils/handle.request.util";

@ApiTags("Explore-Trending")
@Controller("explore")
export class ExploreController {
    constructor(private readonly exploreService: ExploreService) {}

    @Get("trending")
    @ApiOperation({ summary: "Get top communities and NGOs sorted by followers" })
    @ApiBearerAuth()
    async exploreTop(@Query() query: ExploreDto) {
        return this.exploreService.exploreTop(query.search);
    }

    @Get("ngos")
    @ApiOperation({ summary: "Get top NGOs sorted by followers" })
    @ApiBearerAuth()
    async exploreTopNgos(@Query() query: ExploreDto) {
        return handleRequest(
            () => this.exploreService.exploreTopNgos(query.search),
            "Top NGOs fetched successfully",
        );
    }

    @Get("communities")
    @ApiOperation({ summary: "Get top communities sorted by followers" })
    @ApiBearerAuth()
    async exploreTopCommunities(@Query() query: ExploreDto) {
        return handleRequest(
            () => this.exploreService.exploreTopCommunities(query.search),
            "Top communities fetched successfully",
        );
    }
}
