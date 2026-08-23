import { GetUser, ValidateAuth } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { TalentSearchQueryDto, UnlockTalentCandidateDto } from "./dto/talent-sourcing.dto";
import { TalentSourcingService } from "./talent-sourcing.service";

@ApiTags("Employer talent sourcing")
@Controller("corporate/talent")
export class TalentController {
    constructor(private readonly talentService: TalentSourcingService) {}

    @Get("search")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Search reputation-ranked candidates",
        description:
            "Corporate employers discover members who opted into talent search. Results ranked by Cap, verified hours, and activity.",
    })
    async search(
        @GetUser("userId") userId: string,
        @GetUser("role") role: Role,
        @Query() query: TalentSearchQueryDto,
    ) {
        const data = await this.talentService.search(userId, role, query);
        return successResponse(data, "Talent search results retrieved");
    }

    @Get("quota")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Talent unlock quota for my corporate membership" })
    async quota(@GetUser("userId") userId: string, @GetUser("role") role: Role) {
        const data = await this.talentService.getQuota(userId, role);
        return successResponse(data, "Talent sourcing quota retrieved");
    }

    @Get("unlocks/me")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "List candidates unlocked by my organisation" })
    async listUnlocks(@GetUser("userId") userId: string, @GetUser("role") role: Role) {
        const data = await this.talentService.listUnlocks(userId, role);
        return successResponse(data, "Talent unlocks retrieved");
    }

    @Post("unlocks")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Unlock a candidate profile (paid quota action)",
        description:
            "Returns full reputation passport for the candidate. Counts against corporate tier unlock limit.",
    })
    async unlock(
        @GetUser("userId") userId: string,
        @GetUser("role") role: Role,
        @Body() dto: UnlockTalentCandidateDto,
    ) {
        const data = await this.talentService.unlockCandidate(
            userId,
            role,
            dto.candidateUserId,
            dto.corporateMembershipId,
        );
        return successResponse(data, "Candidate unlocked");
    }
}
