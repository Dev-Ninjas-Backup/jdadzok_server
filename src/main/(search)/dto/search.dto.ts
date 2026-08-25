import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsBoolean,
    IsInt,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from "class-validator";

export class SearchQueryDto {
    @ApiPropertyOptional({
        description: 'Search query, e.g. "mentor React Accra" or "remote health volunteering"',
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    q?: string;

    @ApiPropertyOptional({
        description:
            "Comma-separated entity types: member,opportunity,bridge,ngo,community,post (default: all)",
        example: "member,opportunity,bridge,ngo,community,post",
    })
    @IsOptional()
    @IsString()
    types?: string;

    @ApiPropertyOptional({ description: "Filter by location substring / facet" })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ description: "Filter members by Cap level", example: "GREEN" })
    @IsOptional()
    @IsString()
    capLevel?: string;

    @ApiPropertyOptional({
        description: "Force guest-safe mode (public entities / fields only)",
        default: false,
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    guest?: boolean;

    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number = 20;
}
