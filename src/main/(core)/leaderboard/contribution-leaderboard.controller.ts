import { MakePublic } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ContributionLeaderboardService } from "./contribution-leaderboard.service";
import { ContributionLeaderboardQueryDto } from "./dto/contribution-leaderboard.dto";

@ApiTags("Recognition leaderboard")
@Controller("leaderboard")
export class ContributionLeaderboardController {
    constructor(private readonly leaderboardService: ContributionLeaderboardService) {}

    @Get("contribution")
    @MakePublic()
    @ApiOperation({
        summary: "Contribution recognition leaderboard",
        description:
            "Ranks members by verified volunteer hours, mentoring hours, and endorsements received. Explicitly excludes followers, activity score, and revenue.",
    })
    async contribution(@Query() query: ContributionLeaderboardQueryDto) {
        const data = await this.leaderboardService.getLeaderboard(query);
        return successResponse(data, "Contribution leaderboard retrieved");
    }
}
