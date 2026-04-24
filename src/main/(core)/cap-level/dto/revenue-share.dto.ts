import { capLevel } from "@constants/enums";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CapLevel } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

/**
 * DTO for creating a new revenue share record
 */
export class CreateRevenueShareDto {
    @ApiProperty({ description: "User ID receiving revenue share" })
    @IsString()
    userId: string;

    @ApiProperty({
        description: "Month of revenue (1-12)",
        minimum: 1,
        maximum: 12,
    })
    @IsInt()
    @Min(1)
    @Max(12)
    month: number;

    @ApiProperty({ description: "Year of revenue", example: 2025 })
    @IsInt()
    @Min(2020)
    @Max(2100)
    year: number;

    @ApiProperty({ description: "Revenue amount earned", minimum: 0 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    amount: number;

    @ApiProperty({
        description: "User cap level at the time of earning",
        enum: capLevel,
        example: "GREEN",
    })
    @IsEnum(CapLevel)
    capLevelAtTime: CapLevel;

    @ApiProperty({
        description: "Revenue share percentage (2%, 10%, 20%, etc.)",
        minimum: 0,
        maximum: 100,
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(100)
    sharePercentage: number;
}

/**
 * DTO for revenue share response
 */
export class RevenueShareResponseDto extends CreateRevenueShareDto {
    @ApiProperty({ description: "Unique revenue share ID" })
    @IsString()
    id: string;

    @ApiProperty({ description: "Record creation timestamp" })
    createdAt: Date;

    @ApiProperty({ description: "Record last update timestamp" })
    updatedAt: Date;
}

/**
 * DTO for user revenue history query parameters
 */
export class RevenueHistoryQueryDto {
    @ApiPropertyOptional({ description: "Year filter", example: 2025 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(2020)
    @Max(2100)
    year?: number;

    @ApiPropertyOptional({
        description: "Month filter (1-12)",
        minimum: 1,
        maximum: 12,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(12)
    month?: number;

    @ApiPropertyOptional({ description: "Cap level filter", enum: CapLevel })
    @IsOptional()
    @IsEnum(CapLevel)
    capLevel?: CapLevel;

    @ApiPropertyOptional({
        description: "Page number for pagination",
        default: 1,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: "Items per page",
        default: 20,
        minimum: 1,
        maximum: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;
}

/**
 * DTO for monthly revenue calculation request
 */
export class MonthlyRevenueCalculationDto {
    @ApiProperty({
        description: "Month to calculate (1-12)",
        minimum: 1,
        maximum: 12,
    })
    @IsInt()
    @Min(1)
    @Max(12)
    month: number;

    @ApiProperty({ description: "Year to calculate", example: 2025 })
    @IsInt()
    @Min(2020)
    @Max(2100)
    year: number;

    @ApiProperty({
        description: "Total platform revenue for the month",
        minimum: 0,
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    totalPlatformRevenue: number;

    @ApiPropertyOptional({
        description: "Whether to dry run (calculate without saving)",
        default: false,
    })
    @IsOptional()
    @Transform(({ value }) => value === "true" || value === true)
    dryRun?: boolean = false;
}

/**
 * DTO for revenue calculation result
 */
export class RevenueCalculationResultDto {
    @ApiProperty({ description: "Total users processed" })
    @IsInt()
    @Min(0)
    totalUsers: number;

    @ApiProperty({ description: "Total revenue distributed", minimum: 0 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    totalDistributed: number;

    @ApiProperty({ description: "Revenue distribution by cap level" })
    distributionByLevel: Record<
        CapLevel,
        {
            userCount: number;
            totalAmount: number;
            sharePercentage: number;
        }
    >;

    @ApiProperty({ description: "Month of calculation" })
    @IsInt()
    @Min(1)
    @Max(12)
    month: number;

    @ApiProperty({ description: "Year of calculation" })
    @IsInt()
    year: number;

    @ApiProperty({ description: "Whether this was a dry run" })
    isDryRun: boolean;

    @ApiProperty({ description: "Calculation timestamp" })
    calculatedAt: Date;
}

/**
 * DTO for platform revenue statistics
 */
export class PlatformRevenueStatsDto {
    @ApiProperty({ description: "Total revenue generated to date" })
    @IsNumber({ maxDecimalPlaces: 2 })
    totalRevenue: number;

    @ApiProperty({ description: "Total revenue distributed to users" })
    @IsNumber({ maxDecimalPlaces: 2 })
    totalDistributed: number;

    @ApiProperty({ description: "Platform revenue retention" })
    @IsNumber({ maxDecimalPlaces: 2 })
    platformRetention: number;

    @ApiProperty({ description: "Current month revenue" })
    @IsNumber({ maxDecimalPlaces: 2 })
    currentMonthRevenue: number;

    @ApiProperty({ description: "Current month distributed" })
    @IsNumber({ maxDecimalPlaces: 2 })
    currentMonthDistributed: number;

    @ApiProperty({ description: "Average revenue per user" })
    @IsNumber({ maxDecimalPlaces: 2 })
    averageRevenuePerUser: number;

    @ApiProperty({ description: "Revenue statistics by cap level" })
    levelStats: Record<
        CapLevel,
        {
            userCount: number;
            totalEarnings: number;
            averageEarnings: number;
            sharePercentage: number;
        }
    >;

    @ApiProperty({ description: "Monthly revenue trend (last 12 months)" })
    monthlyTrend: {
        month: number;
        year: number;
        totalRevenue: number;
        totalDistributed: number;
        activeUsers: number;
    }[];
}

/**
 * DTO for user revenue summary
 */
export class UserRevenueSummaryDto {
    @ApiProperty({ description: "User ID" })
    @IsString()
    userId: string;

    @ApiProperty({ description: "User current cap level", enum: CapLevel })
    @IsEnum(CapLevel)
    currentCapLevel: CapLevel;

    @ApiProperty({ description: "Total earnings to date" })
    @IsNumber({ maxDecimalPlaces: 2 })
    totalEarnings: number;

    @ApiProperty({ description: "Current month earnings" })
    @IsNumber({ maxDecimalPlaces: 2 })
    currentMonthEarnings: number;

    @ApiProperty({ description: "Last 12 months earnings" })
    @IsNumber({ maxDecimalPlaces: 2 })
    last12MonthsEarnings: number;

    @ApiProperty({ description: "Average monthly earnings" })
    @IsNumber({ maxDecimalPlaces: 2 })
    averageMonthlyEarnings: number;

    @ApiProperty({ description: "Best earning month info" })
    bestMonth: {
        month: number;
        year: number;
        amount: number;
        capLevel: CapLevel;
    };

    @ApiProperty({ description: "Total months with earnings" })
    @IsInt()
    @Min(0)
    activeMonths: number;

    @ApiProperty({ description: "Revenue rank among all users" })
    @IsInt()
    @Min(1)
    revenueRank: number;

    @ApiProperty({ description: "Recent revenue history (last 6 months)" })
    recentHistory: RevenueShareResponseDto[];
}
