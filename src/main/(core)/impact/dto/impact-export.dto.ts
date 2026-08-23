import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsISO8601, IsNumber, IsOptional, Max, Min } from "class-validator";

export class ImpactExportQueryDto {
    @ApiPropertyOptional({ description: "Include verified hours on or after this date (ISO 8601)" })
    @IsOptional()
    @IsISO8601()
    fromDate?: string;

    @ApiPropertyOptional({ description: "Include verified hours before this date (ISO 8601)" })
    @IsOptional()
    @IsISO8601()
    toDate?: string;

    @ApiPropertyOptional({
        description: "k-anonymity minimum bucket size (default 5, max 50)",
        default: 5,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(2)
    @Max(50)
    minBucketSize?: number;
}
