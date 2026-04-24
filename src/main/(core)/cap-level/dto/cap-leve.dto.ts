import { CapLevel } from "@constants/enums";
import { ApiProperty, IntersectionType, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

// Export additional comprehensive DTOs
export * from "./revenue-share.dto";
export * from "./user-metrics.dto";
export * from "./volunteer-tracking.dto";

class CapLevelDto {
    @ApiProperty({
        description: "Cap level",
        enum: ["GREEN", "YELLOW", "RED", "BLACK", "OSTRICH_FEATHER"],
    })
    @IsEnum(["GREEN", "YELLOW", "RED", "BLACK", "OSTRICH_FEATHER"])
    capLevel: CapLevel;

    @ApiProperty({
        description: "Minimum activity score required",
        required: false,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    minActivityScore?: number;

    @ApiProperty({
        description: "Minimum volunteer hours required",
        required: false,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    minVolunteerHours?: number;

    @ApiProperty({
        description: "Whether admin verification is required",
        default: false,
    })
    @IsBoolean()
    requiresVerification: boolean;

    @ApiProperty({
        description: "Whether panel nomination is required",
        default: false,
    })
    @IsBoolean()
    requiresNomination: boolean;

    @ApiProperty({
        description: "Ad revenue share percentage",
        minimum: 0,
        maximum: 100,
    })
    @IsNumber()
    @Min(0)
    @Max(100)
    adSharePercentage: number;

    @ApiProperty({ description: "Can access marketplace", default: false })
    @IsBoolean()
    canAccessMarketplace: boolean;

    @ApiProperty({ description: "Can access volunteer hub", default: false })
    @IsBoolean()
    canAccessVolunteerHub: boolean;

    @ApiProperty({ description: "Can receive brand deals", default: false })
    @IsBoolean()
    canReceiveBrandDeals: boolean;

    @ApiProperty({
        description: "Description of this cap level",
        required: false,
    })
    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateCapLevelDto extends IntersectionType(CapLevelDto) {}

export class UpdateCapLevelDto extends PartialType(IntersectionType(CapLevelDto)) {}

export class PromoteUserDto {
    @ApiProperty({
        description: "Target cap level",
        enum: ["GREEN", "YELLOW", "RED", "BLACK", "OSTRICH_FEATHER"],
        required: false,
    })
    @IsOptional()
    @IsEnum(["GREEN", "YELLOW", "RED", "BLACK", "OSTRICH_FEATHER"])
    targetLevel?: CapLevel;

    @ApiProperty({
        description: "Bypass admin verification requirements",
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    bypassVerification?: boolean;
}
