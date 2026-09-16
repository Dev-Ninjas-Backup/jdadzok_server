import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { ApplicationStatus } from "@prisma/client";

export class GetVolunteerApplicationsQueryDto {
    @ApiPropertyOptional({ description: "Filter by application status", enum: ApplicationStatus })
    @IsOptional()
    @IsEnum(ApplicationStatus)
    status?: ApplicationStatus;

    @ApiPropertyOptional({ description: "Filter by volunteer project id" })
    @IsOptional()
    @IsString()
    projectId?: string;

    @ApiPropertyOptional({
        description: "Search by volunteer email or project title",
        example: "jane",
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: "Page number", default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: "Items per page", default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}
