import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SponsoredTargetType } from "@prisma/client";
import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateIf } from "class-validator";

export class CreateSponsoredOpportunityDto {
    @ApiProperty({ enum: SponsoredTargetType })
    @IsEnum(SponsoredTargetType)
    targetType: SponsoredTargetType;

    @ApiPropertyOptional({ description: "Required when targetType is VOLUNTEER_PROJECT" })
    @ValidateIf((o) => o.targetType === SponsoredTargetType.VOLUNTEER_PROJECT)
    @IsUUID()
    volunteerProjectId?: string;

    @ApiPropertyOptional({ description: "Required when targetType is BRIDGE_LISTING" })
    @ValidateIf((o) => o.targetType === SponsoredTargetType.BRIDGE_LISTING)
    @IsUUID()
    bridgeListingId?: string;

    @ApiPropertyOptional({ example: "Acme supports youth mentoring" })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    message?: string;

    @ApiPropertyOptional({ example: 5000 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    budgetAmount?: number;

    @ApiPropertyOptional({ example: "2026-12-31T23:59:59.000Z" })
    @IsOptional()
    @IsISO8601()
    endsAt?: string;

    @ApiPropertyOptional({ description: "Admin only — sponsor on behalf of a membership" })
    @IsOptional()
    @IsUUID()
    corporateMembershipId?: string;
}

export class SponsoredDiscoverQueryDto {
    @ApiPropertyOptional({ enum: SponsoredTargetType })
    @IsOptional()
    @IsEnum(SponsoredTargetType)
    targetType?: SponsoredTargetType;
}
