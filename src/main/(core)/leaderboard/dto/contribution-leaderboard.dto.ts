import { ApiPropertyOptional } from "@nestjs/swagger";
import { CapLevel } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, Max, Min } from "class-validator";
import { ContributionSortField } from "@common/utils/contribution-score.util";

export class ContributionLeaderboardQueryDto {
    @ApiPropertyOptional({ default: 50, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number;

    @ApiPropertyOptional({
        enum: ["combined", "hours", "mentorship", "endorsements"],
        default: "combined",
        description:
            "Rank strictly by contribution signals — never followers or activity score",
    })
    @IsOptional()
    @IsEnum(["combined", "hours", "mentorship", "endorsements"])
    sortBy?: ContributionSortField;

    @ApiPropertyOptional({ enum: CapLevel, description: "Optional minimum Cap filter" })
    @IsOptional()
    @IsEnum(CapLevel)
    minCapLevel?: CapLevel;
}
