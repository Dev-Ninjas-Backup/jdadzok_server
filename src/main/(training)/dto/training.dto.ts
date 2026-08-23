import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { TrainingCourseStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
    ArrayMaxSize,
    IsArray,
    IsEnum,
    IsISO8601,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from "class-validator";

export class CreateTrainingCourseDto {
    @ApiProperty({ example: "Community leadership workshop" })
    @IsString()
    @MinLength(3)
    @MaxLength(200)
    title: string;

    @ApiProperty({ example: "Six-week cohort covering facilitation and volunteer coordination." })
    @IsString()
    @MinLength(10)
    description: string;

    @ApiPropertyOptional({ type: [String], example: ["leadership", "facilitation"] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    skills?: string[];

    @ApiProperty({ example: 49.99 })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional({ default: "USD" })
    @IsOptional()
    @IsString()
    @MaxLength(8)
    currency?: string;

    @ApiPropertyOptional({ enum: TrainingCourseStatus, default: TrainingCourseStatus.DRAFT })
    @IsOptional()
    @IsEnum(TrainingCourseStatus)
    status?: TrainingCourseStatus;
}

export class UpdateTrainingCourseDto extends PartialType(CreateTrainingCourseDto) {}

export class TrainingCourseListQueryDto {
    @ApiPropertyOptional({ description: "Search title or description" })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    q?: string;

    @ApiPropertyOptional({ description: "Filter by skill tag" })
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
    limit?: number;
}

export class CreateTrainingCohortDto {
    @ApiPropertyOptional({ example: "Spring 2026 cohort" })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @ApiProperty({ example: "2026-03-01T09:00:00.000Z" })
    @IsISO8601()
    startsAt: string;

    @ApiPropertyOptional({ example: "2026-04-15T17:00:00.000Z" })
    @IsOptional()
    @IsISO8601()
    endsAt?: string;

    @ApiProperty({ example: 25 })
    @IsNumber()
    @Min(1)
    capacity: number;
}

export class EnrollTrainingCohortDto {
    @ApiPropertyOptional({ description: "Override price for admin/testing" })
    @IsOptional()
    @IsNumber()
    @Min(0)
    pricePaid?: number;
}
