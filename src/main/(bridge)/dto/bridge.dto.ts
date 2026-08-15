import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { BridgeListingStatus, BridgeListingType } from "@prisma/client";
import { Type } from "class-transformer";
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    MinLength,
} from "class-validator";

export class CreateBridgeListingDto {
    @ApiProperty({ enum: BridgeListingType })
    @IsEnum(BridgeListingType)
    type: BridgeListingType;

    @ApiProperty({ example: "React mentoring / Accra" })
    @IsString()
    @MinLength(3)
    @MaxLength(200)
    title: string;

    @ApiProperty({ example: "Available for paid mentoring sessions and short gigs." })
    @IsString()
    @MinLength(10)
    description: string;

    @ApiPropertyOptional({ type: [String], example: ["react", "typescript"] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    skills?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    location?: string;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    remoteOk?: boolean;

    @ApiPropertyOptional({ enum: BridgeListingStatus, default: BridgeListingStatus.OPEN })
    @IsOptional()
    @IsEnum(BridgeListingStatus)
    status?: BridgeListingStatus;

    // Expertise
    @ApiPropertyOptional({ description: "Hourly rate for EXPERTISE listings" })
    @IsOptional()
    @IsNumber()
    @Min(0)
    hourlyRate?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    availabilityNote?: string;

    // Gig / project help
    @ApiPropertyOptional({ description: "Budget for GIG / PROJECT_HELP" })
    @IsOptional()
    @IsNumber()
    @Min(0)
    budgetAmount?: number;

    @ApiPropertyOptional({ default: "USD" })
    @IsOptional()
    @IsString()
    @MaxLength(8)
    currency?: string;

    @ApiPropertyOptional({
        description: "Scaffold platform fee % (cut of payout) — default 5",
        default: 5,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    platformFeePercent?: number;
}

export class UpdateBridgeListingDto extends PartialType(CreateBridgeListingDto) {}

export class BridgeListQueryDto {
    @ApiPropertyOptional({ enum: BridgeListingType })
    @IsOptional()
    @IsEnum(BridgeListingType)
    type?: BridgeListingType;

    @ApiPropertyOptional({ enum: BridgeListingStatus })
    @IsOptional()
    @IsEnum(BridgeListingStatus)
    status?: BridgeListingStatus;

    @ApiPropertyOptional({ description: "Filter by skill tag (contains)" })
    @IsOptional()
    @IsString()
    skill?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number;
}

export class CreateBridgeBookingDto {
    @ApiPropertyOptional({ description: "Agreed amount for this booking" })
    @IsOptional()
    @IsNumber()
    @Min(0)
    agreedAmount?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    note?: string;
}

export class RespondBridgeBookingDto {
    @ApiProperty({ enum: ["ACCEPTED", "DECLINED"] })
    @IsEnum(["ACCEPTED", "DECLINED"])
    action: "ACCEPTED" | "DECLINED";
}
