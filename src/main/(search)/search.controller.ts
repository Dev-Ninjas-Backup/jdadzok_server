import { Controller, Get, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MakePublic, ValidateAdmin } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { SearchService } from "./search.service";
import { SearchQueryDto } from "./dto/search.dto";
import { Request } from "express";

@ApiTags("Search")
@Controller("search")
export class SearchController {
    constructor(private readonly searchService: SearchService) {}

    @Get("status")
    @MakePublic()
    @ApiOperation({ summary: "Search provider status (feature flag)" })
    status() {
        return successResponse(this.searchService.status(), "Search status");
    }

    @Get()
    @MakePublic()
    @ApiOperation({
        summary:
            "Unified AI search over members + opportunities (vendor ranking; Postgres hydrate)",
    })
    async search(@Query() query: SearchQueryDto, @Req() req: Request) {
        const authenticated = Boolean((req as Request & { user?: unknown }).user);
        const data = await this.searchService.search(query, { authenticated });
        return successResponse(data, "Search results");
    }

    @Post("reindex")
    @ApiBearerAuth()
    @ValidateAdmin()
    @ApiOperation({
        summary: "Full reindex of members + opportunities into the search vendor (admin)",
    })
    async reindex() {
        const data = await this.searchService.reindex();
        return successResponse(data, "Search reindex completed");
    }
}
