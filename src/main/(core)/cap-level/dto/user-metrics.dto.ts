import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CapLevel } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
    IsArray,
    IsDateString,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Max,
    Min,
} from "class-validator";

/**
 * DTO for activity score calculation weights (admin configurable)
 */
export class ActivityScoreWeightsDto {
    @ApiProperty({
        description: "Points per post created",
        default: 5,
        minimum: 0,
        maximum: 100,
    })
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(0)
    @Max(100)
    posts = 5;

    @ApiProperty({
        description: "Points per comment made",
        default: 2,
        minimum: 0,
        maximum: 100,
    })
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(0)
    @Max(100)
    comments = 2;

    @ApiProperty({
        description: "Points per like given",
        default: 1,
        minimum: 0,
        maximum: 100,
    })
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(0)
    @Max(100)
    likes = 1;

    @ApiProperty({
        description: "Points per share made",
        default: 3,
        minimum: 0,
        maximum: 100,
    })
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(0)
    @Max(100)
    shares = 3;

    @ApiProperty({
        description: "Points per follower gained",
        default: 0.5,
        minimum: 0,
        maximum: 100,
    })
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(0)
    @Max(100)
    followers = 0.5;

    @ApiProperty({
        description: "Points per volunteer hour",
        default: 10,
        minimum: 0,
        maximum: 100,
    })
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(0)
    @Max(100)
    volunteerHours = 10;
}

/**
 * DTO for updating user activity metrics
 */
export class UpdateUserMetricsDto {
    @ApiProperty({ description: "User ID to update metrics for" })
    @IsString()
    userId: string;

    @ApiPropertyOptional({ description: "Total posts count" })
    @IsOptional()
    @IsInt()
    @Min(0)
    totalPosts?: number;

    @ApiPropertyOptional({ description: "Total comments count" })
    @IsOptional()
    @IsInt()
    @Min(0)
    totalComments?: number;

    @ApiPropertyOptional({ description: "Total likes given count" })
    @IsOptional()
    @IsInt()
    @Min(0)
    totalLikes?: number;

    @ApiPropertyOptional({ description: "Total shares count" })
    @IsOptional()
    @IsInt()
    @Min(0)
    totalShares?: number;

    @ApiPropertyOptional({ description: "Total followers count" })
    @IsOptional()
    @IsInt()
    @Min(0)
    totalFollowers?: number;

    @ApiPropertyOptional({ description: "Total volunteer hours" })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(0)
    volunteerHours?: number;

    @ApiPropertyOptional({ description: "Total completed volunteer projects" })
    @IsOptional()
    @IsInt()
    @Min(0)
    completedProjects?: number;

    @ApiPropertyOptional({
        description: "Whether to recalculate activity score after update",
        default: true,
    })
    @IsOptional()
    @Transform(({ value }) => value === "true" || value === true)
    recalculateScore?: boolean = true;
}

/**
 * DTO for manual activity score update (admin only)
 */
export class ManualActivityScoreUpdateDto {
    @ApiProperty({ description: "User ID to update score for" })
    @IsString()
    userId: string;

    @ApiProperty({ description: "New activity score", minimum: 0 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    newScore: number;

    @ApiPropertyOptional({ description: "Reason for manual score adjustment" })
    @IsOptional()
    @IsString()
    reason?: string;

    @ApiProperty({ description: "Admin ID performing the update" })
    @IsString()
    adminId: string;
}

/**
 * DTO for user metrics response
 */
export class UserMetricsResponseDto {
    @ApiProperty({ description: "User metrics ID" })
    @IsString()
    id: string;

    @ApiProperty({ description: "User ID" })
    @IsString()
    userId: string;

    @ApiProperty({ description: "Total posts count" })
    @IsInt()
    @Min(0)
    totalPosts: number;

    @ApiProperty({ description: "Total comments count" })
    @IsInt()
    @Min(0)
    totalComments: number;

    @ApiProperty({ description: "Total likes given" })
    @IsInt()
    @Min(0)
    totalLikes: number;

    @ApiProperty({ description: "Total shares count" })
    @IsInt()
    @Min(0)
    totalShares: number;

    @ApiProperty({ description: "Total followers count" })
    @IsInt()
    @Min(0)
    totalFollowers: number;

    @ApiProperty({ description: "Total following count" })
    @IsInt()
    @Min(0)
    totalFollowing: number;

    @ApiProperty({ description: "Total earnings to date" })
    @IsNumber({ maxDecimalPlaces: 2 })
    totalEarnings: number;

    @ApiProperty({ description: "Current month earnings" })
    @IsNumber({ maxDecimalPlaces: 2 })
    currentMonthEarnings: number;

    @ApiProperty({ description: "Total volunteer hours" })
    @IsNumber({ maxDecimalPlaces: 1 })
    volunteerHours: number;

    @ApiProperty({ description: "Completed volunteer projects" })
    @IsInt()
    @Min(0)
    completedProjects: number;

    @ApiProperty({ description: "Calculated activity score" })
    @IsNumber({ maxDecimalPlaces: 2 })
    activityScore: number;

    @ApiProperty({ description: "Last metrics update timestamp" })
    lastUpdated: Date;

    @ApiProperty({ description: "Record creation timestamp" })
    createdAt: Date;

    @ApiProperty({ description: "Record last modification timestamp" })
    updatedAt: Date;
}

/**
 * DTO for user activity analytics
 */
export class UserActivityAnalyticsDto {
    @ApiProperty({ description: "User ID" })
    @IsString()
    userId: string;

    @ApiProperty({ description: "Current activity score" })
    @IsNumber({ maxDecimalPlaces: 2 })
    currentScore: number;

    @ApiProperty({ description: "Activity score history (last 12 months)" })
    scoreHistory: {
        month: number;
        year: number;
        score: number;
        rank: number;
    }[];

    @ApiProperty({ description: "Activity breakdown by type" })
    activityBreakdown: {
        posts: { count: number; points: number; percentage: number };
        comments: { count: number; points: number; percentage: number };
        likes: { count: number; points: number; percentage: number };
        shares: { count: number; points: number; percentage: number };
        followers: { count: number; points: number; percentage: number };
        volunteerHours: { count: number; points: number; percentage: number };
    };

    @ApiProperty({ description: "User current rank among all users" })
    @IsInt()
    @Min(1)
    currentRank: number;

    @ApiProperty({ description: "Rank change from last month" })
    @IsInt()
    rankChange: number;

    @ApiProperty({ description: "Users with higher scores" })
    @IsInt()
    @Min(0)
    usersAbove: number;

    @ApiProperty({ description: "Users with lower scores" })
    @IsInt()
    @Min(0)
    usersBelow: number;

    @ApiProperty({ description: "Percentile ranking (0-100)" })
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(0)
    @Max(100)
    percentile: number;

    @ApiProperty({ description: "Recent activity timeline (last 30 days)" })
    recentActivity: {
        date: string;
        activityType: "POST" | "COMMENT" | "LIKE" | "SHARE" | "FOLLOW" | "VOLUNTEER";
        points: number;
        description: string;
    }[];
}

/**
 * DTO for platform activity leaderboard
 */
export class ActivityLeaderboardDto {
    @ApiProperty({ description: "User ranking (1-based)" })
    @IsInt()
    @Min(1)
    rank: number;

    @ApiProperty({ description: "User ID" })
    @IsString()
    userId: string;

    @ApiProperty({ description: "User display name" })
    @IsString()
    displayName: string;

    @ApiProperty({ description: "User avatar URL" })
    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @ApiProperty({ description: "Activity score" })
    @IsNumber({ maxDecimalPlaces: 2 })
    activityScore: number;

    @ApiProperty({ description: "User current cap level", enum: CapLevel })
    @IsEnum(CapLevel)
    capLevel: CapLevel;

    @ApiProperty({ description: "Total posts" })
    @IsInt()
    @Min(0)
    totalPosts: number;

    @ApiProperty({ description: "Total volunteer hours" })
    @IsNumber({ maxDecimalPlaces: 1 })
    volunteerHours: number;

    @ApiProperty({ description: "Rank change from last period" })
    @IsInt()
    rankChange: number;
}

/**
 * DTO for metrics query parameters
 */
export class MetricsQueryDto {
    @ApiPropertyOptional({ description: "Filter by cap level", enum: CapLevel })
    @IsOptional()
    @IsEnum(CapLevel)
    capLevel?: CapLevel;

    @ApiPropertyOptional({ description: "Minimum activity score filter" })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    minScore?: number;

    @ApiPropertyOptional({ description: "Maximum activity score filter" })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    maxScore?: number;

    @ApiPropertyOptional({ description: "Filter by minimum volunteer hours" })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(0)
    minVolunteerHours?: number;

    @ApiPropertyOptional({ description: "Start date for metrics (ISO string)" })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: "End date for metrics (ISO string)" })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({
        description: "Sort by field",
        enum: ["activityScore", "totalPosts", "volunteerHours", "totalEarnings"],
    })
    @IsOptional()
    @IsString()
    sortBy?: "activityScore" | "totalPosts" | "volunteerHours" | "totalEarnings";

    @ApiPropertyOptional({
        description: "Sort order",
        enum: ["asc", "desc"],
        default: "desc",
    })
    @IsOptional()
    @IsString()
    sortOrder?: "asc" | "desc" = "desc";

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
 * DTO for batch metrics recalculation
 */
export class BatchMetricsRecalculationDto {
    @ApiPropertyOptional({
        description: "Specific user IDs to recalculate (if empty, recalculates all)",
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    userIds?: string[];

    @ApiPropertyOptional({
        description: "Filter by cap level for batch recalculation",
        enum: CapLevel,
    })
    @IsOptional()
    @IsEnum(CapLevel)
    capLevel?: CapLevel;

    @ApiPropertyOptional({
        description: "Only recalculate users last updated before this date",
    })
    @IsOptional()
    @IsDateString()
    lastUpdatedBefore?: string;

    @ApiProperty({ description: "Admin ID performing batch recalculation" })
    @IsString()
    adminId: string;

    @ApiPropertyOptional({
        description: "Batch size for processing (default: 50)",
        default: 50,
        minimum: 1,
        maximum: 500,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(500)
    batchSize?: number = 50;
}

/**
 * DTO for platform activity statistics
 */
export class PlatformActivityStatsDto {
    @ApiProperty({ description: "Total users with metrics" })
    @IsInt()
    @Min(0)
    totalUsers: number;

    @ApiProperty({ description: "Active users (activity in last 30 days)" })
    @IsInt()
    @Min(0)
    activeUsers: number;

    @ApiProperty({ description: "Average activity score across platform" })
    @IsNumber({ maxDecimalPlaces: 2 })
    averageActivityScore: number;

    @ApiProperty({ description: "Median activity score" })
    @IsNumber({ maxDecimalPlaces: 2 })
    medianActivityScore: number;

    @ApiProperty({ description: "Highest activity score on platform" })
    @IsNumber({ maxDecimalPlaces: 2 })
    highestActivityScore: number;

    @ApiProperty({ description: "Total platform posts" })
    @IsInt()
    @Min(0)
    totalPosts: number;

    @ApiProperty({ description: "Total platform comments" })
    @IsInt()
    @Min(0)
    totalComments: number;

    @ApiProperty({ description: "Total platform likes" })
    @IsInt()
    @Min(0)
    totalLikes: number;

    @ApiProperty({ description: "Total platform shares" })
    @IsInt()
    @Min(0)
    totalShares: number;

    @ApiProperty({ description: "Total volunteer hours platform-wide" })
    @IsNumber({ maxDecimalPlaces: 1 })
    totalVolunteerHours: number;

    @ApiProperty({ description: "Activity statistics by cap level" })
    statsByCapLevel: Record<
        CapLevel,
        {
            userCount: number;
            averageScore: number;
            averagePosts: number;
            averageVolunteerHours: number;
        }
    >;

    @ApiProperty({ description: "Monthly activity trend (last 12 months)" })
    monthlyTrend: {
        month: number;
        year: number;
        activeUsers: number;
        averageScore: number;
        totalPosts: number;
        totalVolunteerHours: number;
    }[];
}
