import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export type OpportunityAudience = "VOLUNTEER" | "MENTORSHIP";

export class GuestExploreQueryDto {
    @ApiPropertyOptional({ description: "Search term for opportunities and listings" })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        enum: ["VOLUNTEER", "MENTORSHIP"],
        description:
            "VOLUNTEER (default) returns NGO volunteer projects. MENTORSHIP returns open Bridge " +
            "listings tagged MENTORING/ADVICE — a separate dataset from volunteer projects.",
    })
    @IsOptional()
    @IsEnum(["VOLUNTEER", "MENTORSHIP"])
    audience?: OpportunityAudience;

    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 12, minimum: 1, maximum: 50 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 12;
}
