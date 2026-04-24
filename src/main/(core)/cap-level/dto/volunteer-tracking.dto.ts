import { applicationStatus, volunteerStatus } from "@constants/enums";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ApplicationStatus, VolunteerStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
    ArrayMinSize,
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
 * DTO for updating volunteer hours
 */
export class UpdateVolunteerHoursDto {
    @ApiProperty({ description: "User ID to update hours for" })
    @IsString()
    userId: string;

    @ApiProperty({
        description: "Number of hours to add",
        minimum: 0.5,
        maximum: 24,
    })
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(0.5)
    @Max(24)
    hours: number;

    @ApiProperty({
        description: "Volunteer project ID (optional for verification)",
    })
    @IsOptional()
    @IsString()
    projectId?: string;

    @ApiPropertyOptional({ description: "Description of volunteer work done" })
    @IsOptional()
    @IsString()
    workDescription?: string;

    @ApiPropertyOptional({
        description: "Date of volunteer work (ISO string)",
        example: "2025-01-15T10:00:00Z",
    })
    @IsOptional()
    @IsDateString()
    workDate?: string;
}

/**
 * DTO for volunteer application status update
 */
export class UpdateApplicationStatusDto {
    @ApiProperty({
        description: "New application status",
        enum: applicationStatus,
        example: "ACCEPTED",
    })
    @IsEnum(ApplicationStatus)
    status: ApplicationStatus;

    @ApiPropertyOptional({
        description: "Admin comment/feedback on the application",
    })
    @IsOptional()
    @IsString()
    adminComment?: string;

    @ApiProperty({ description: "Admin user ID performing the update" })
    @IsString()
    adminId: string;
}

/**
 * DTO for volunteer project completion tracking
 */
export class ProjectCompletionDto {
    @ApiProperty({ description: "Volunteer project ID" })
    @IsString()
    projectId: string;

    @ApiProperty({ description: "User ID who completed the project" })
    @IsString()
    userId: string;

    @ApiProperty({ description: "Total hours worked on the project", minimum: 1 })
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(1)
    totalHours: number;

    @ApiPropertyOptional({ description: "Project completion notes" })
    @IsOptional()
    @IsString()
    completionNotes?: string;

    @ApiPropertyOptional({
        description: "Completion certificate URL or file path",
    })
    @IsOptional()
    @IsString()
    certificateUrl?: string;

    @ApiProperty({
        description: "Completion verification by project creator/admin",
    })
    @IsString()
    verifiedBy: string;
}

/**
 * DTO for 8-week service completion verification
 */
export class ServiceCompletionDto {
    @ApiProperty({ description: "User ID completing 8-week service" })
    @IsString()
    userId: string;

    @ApiProperty({
        description: "Total volunteer hours completed (minimum 200 hours)",
    })
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(200)
    totalHours: number;

    @ApiProperty({ description: "Number of weeks active (minimum 8)" })
    @IsInt()
    @Min(8)
    weeksActive: number;

    @ApiProperty({ description: "List of completed project IDs" })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    completedProjectIds: string[];

    @ApiPropertyOptional({ description: "Service completion summary" })
    @IsOptional()
    @IsString()
    serviceSummary?: string;

    @ApiProperty({ description: "Admin verifying the service completion" })
    @IsString()
    verifiedBy: string;

    @ApiProperty({ description: "Service start date" })
    @IsDateString()
    serviceStartDate: string;

    @ApiProperty({ description: "Service completion date" })
    @IsDateString()
    serviceEndDate: string;
}

/**
 * DTO for volunteer statistics query
 */
export class VolunteerStatsQueryDto {
    @ApiPropertyOptional({
        description: "Start date for statistics (ISO string)",
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ description: "End date for statistics (ISO string)" })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional({ description: "Filter by project ID" })
    @IsOptional()
    @IsString()
    projectId?: string;

    @ApiPropertyOptional({
        description: "Filter by application status",
        enum: ApplicationStatus,
    })
    @IsOptional()
    @IsEnum(ApplicationStatus)
    status?: ApplicationStatus;

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
 * DTO for user volunteer summary
 */
export class UserVolunteerSummaryDto {
    @ApiProperty({ description: "User ID" })
    @IsString()
    userId: string;

    @ApiProperty({ description: "Total volunteer hours completed" })
    @IsNumber({ maxDecimalPlaces: 1 })
    totalHours: number;

    @ApiProperty({ description: "Number of projects completed" })
    @IsInt()
    @Min(0)
    completedProjects: number;

    @ApiProperty({ description: "Number of active applications" })
    @IsInt()
    @Min(0)
    activeApplications: number;

    @ApiProperty({ description: "Average hours per project" })
    @IsNumber({ maxDecimalPlaces: 1 })
    averageHoursPerProject: number;

    @ApiProperty({ description: "Weeks active in volunteering" })
    @IsInt()
    @Min(0)
    weeksActive: number;

    @ApiProperty({
        description: "Whether user has completed 8-week service requirement",
    })
    hasCompleted8WeekService: boolean;

    @ApiProperty({
        description: "Date when 8-week service was completed (if applicable)",
    })
    @IsOptional()
    serviceCompletionDate?: Date;

    @ApiProperty({ description: "Volunteer rank among all users" })
    @IsInt()
    @Min(1)
    volunteerRank: number;

    @ApiProperty({ description: "Recent volunteer activities" })
    recentActivities: {
        projectId: string;
        projectTitle: string;
        hoursContributed: number;
        status: ApplicationStatus;
        lastActivity: Date;
    }[];
}

/**
 * DTO for volunteer project statistics
 */
export class ProjectVolunteerStatsDto {
    @ApiProperty({ description: "Project ID" })
    @IsString()
    projectId: string;

    @ApiProperty({ description: "Project title" })
    @IsString()
    projectTitle: string;

    @ApiProperty({ description: "Total applications received" })
    @IsInt()
    @Min(0)
    totalApplications: number;

    @ApiProperty({ description: "Accepted applications" })
    @IsInt()
    @Min(0)
    acceptedApplications: number;

    @ApiProperty({ description: "Total volunteer hours contributed" })
    @IsNumber({ maxDecimalPlaces: 1 })
    totalVolunteerHours: number;

    @ApiProperty({ description: "Number of active volunteers" })
    @IsInt()
    @Min(0)
    activeVolunteers: number;

    @ApiProperty({ description: "Project completion rate (percentage)" })
    @IsNumber({ maxDecimalPlaces: 1 })
    @Min(0)
    @Max(100)
    completionRate: number;

    @ApiProperty({ description: "Average hours per volunteer" })
    @IsNumber({ maxDecimalPlaces: 1 })
    averageHoursPerVolunteer: number;

    @ApiProperty({ description: "Project status", enum: volunteerStatus })
    @IsEnum(VolunteerStatus)
    projectStatus: VolunteerStatus;
}

/**
 * DTO for batch volunteer hours update
 */
export class BatchVolunteerHoursUpdateDto {
    @ApiProperty({ description: "Array of volunteer hour updates" })
    @IsArray()
    @ArrayMinSize(1)
    @Type(() => UpdateVolunteerHoursDto)
    updates: UpdateVolunteerHoursDto[];

    @ApiProperty({ description: "Admin ID performing batch update" })
    @IsString()
    adminId: string;

    @ApiPropertyOptional({ description: "Batch update notes" })
    @IsOptional()
    @IsString()
    batchNotes?: string;
}

/**
 * DTO for volunteer leaderboard
 */
export class VolunteerLeaderboardDto {
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

    @ApiProperty({ description: "Total volunteer hours" })
    @IsNumber({ maxDecimalPlaces: 1 })
    totalHours: number;

    @ApiProperty({ description: "Number of completed projects" })
    @IsInt()
    @Min(0)
    completedProjects: number;

    @ApiProperty({ description: "User current cap level" })
    @IsString()
    capLevel: string;

    @ApiProperty({ description: "Has completed 8-week service" })
    hasCompleted8WeekService: boolean;

    @ApiProperty({ description: "Weeks active" })
    @IsInt()
    @Min(0)
    weeksActive: number;
}

/**
 * DTO for platform volunteer statistics
 */
export class PlatformVolunteerStatsDto {
    @ApiProperty({ description: "Total registered volunteers" })
    @IsInt()
    @Min(0)
    totalVolunteers: number;

    @ApiProperty({
        description: "Active volunteers (volunteered in last 30 days)",
    })
    @IsInt()
    @Min(0)
    activeVolunteers: number;

    @ApiProperty({ description: "Total volunteer hours platform-wide" })
    @IsNumber({ maxDecimalPlaces: 1 })
    totalHours: number;

    @ApiProperty({ description: "Total completed projects" })
    @IsInt()
    @Min(0)
    totalCompletedProjects: number;

    @ApiProperty({ description: "Users who completed 8-week service" })
    @IsInt()
    @Min(0)
    usersCompleted8WeekService: number;

    @ApiProperty({ description: "Average volunteer hours per user" })
    @IsNumber({ maxDecimalPlaces: 1 })
    averageHoursPerUser: number;

    @ApiProperty({
        description: "Monthly volunteer activity trend (last 12 months)",
    })
    monthlyTrend: {
        month: number;
        year: number;
        totalHours: number;
        activeVolunteers: number;
        newApplications: number;
        completedProjects: number;
    }[];

    @ApiProperty({ description: "Volunteer statistics by cap level" })
    volunteersByCapLevel: Record<
        string,
        {
            count: number;
            averageHours: number;
            completionRate: number;
        }
    >;
}
