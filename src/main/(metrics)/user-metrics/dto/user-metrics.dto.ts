import { ApiProperty, IntersectionType, PartialType } from "@nestjs/swagger";
import { IsDateString, IsNumber, IsOptional, IsUUID } from "class-validator";

class UserMetricsDto {
    @ApiProperty({ description: "Unique User ID" })
    @IsUUID()
    userId: string;

    @ApiProperty({ description: "Total number of posts", required: false })
    @IsNumber()
    @IsOptional()
    totalPosts?: number;

    @ApiProperty({ description: "Total number of comments", required: false })
    @IsNumber()
    @IsOptional()
    totalComments?: number;

    @ApiProperty({ description: "Total number of likes", required: false })
    @IsNumber()
    @IsOptional()
    totalLikes?: number;

    @ApiProperty({ description: "Total number of shares", required: false })
    @IsNumber()
    @IsOptional()
    totalShares?: number;

    @ApiProperty({ description: "Total number of followers", required: false })
    @IsNumber()
    @IsOptional()
    totalFollowers?: number;

    @ApiProperty({ description: "Total number of users being followed", required: false })
    @IsNumber()
    @IsOptional()
    totalFollowing?: number;

    @ApiProperty({ description: "Total earnings", required: false })
    @IsNumber()
    @IsOptional()
    totalEarnings?: number;

    @ApiProperty({ description: "Earnings for the current month", required: false })
    @IsNumber()
    @IsOptional()
    currentMonthEarnings?: number;

    @ApiProperty({ description: "Total volunteer hours", required: false })
    @IsNumber()
    @IsOptional()
    volunteerHours?: number;

    @ApiProperty({ description: "Total completed projects", required: false })
    @IsNumber()
    @IsOptional()
    completedProjects?: number;

    @ApiProperty({ description: "User activity score", required: false })
    @IsNumber()
    @IsOptional()
    activityScore?: number;

    @ApiProperty({ description: "Date when the metrics were last updated", required: false })
    @IsDateString()
    @IsOptional()
    lastUpdated?: string;

    @ApiProperty({ description: "Date when the metrics were created" })
    @IsDateString()
    createdAt: string;

    @ApiProperty({ description: "Date when the metrics were last updated" })
    @IsDateString()
    updatedAt: string;
}
export class CreateUserMetricsDto extends IntersectionType(UserMetricsDto) {}
export class UpdateUserMetricsDto extends IntersectionType(PartialType(UserMetricsDto)) {}
