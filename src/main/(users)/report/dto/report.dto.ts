import { IsString, IsEnum, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ReportStatus, ReportTargetType } from "@prisma/client";

export class CreateReportDto {
    @ApiProperty({
        description: "Type of entity being reported",
        example: ReportTargetType.USER,
        enum: ReportTargetType,
    })
    @IsEnum(ReportTargetType)
    targetType: ReportTargetType;

    @ApiProperty({
        description: "ID of the target entity being reported",
        example: "a1b2c3d4-e5f6-7890-abcd-1234567890ef",
    })
    @IsString()
    targetId: string;

    @ApiProperty({
        description: "Reason for reporting the entity",
        example: "Inappropriate profile picture",
    })
    @IsString()
    reason: string;

    @ApiProperty({
        description: "Optional detailed description for the report",
        example: "The user is posting offensive content in profile",
        required: false,
    })
    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdateReportDto {
    @ApiProperty({
        description: "Status of the report after admin review",
        example: ReportStatus.REVIEWED,
        enum: ReportStatus,
    })
    @IsEnum(ReportStatus)
    status: ReportStatus;

    @ApiProperty({
        description: "Optional notes from the admin after reviewing the report",
        example: "Reviewed and user warned for inappropriate behavior",
        required: false,
    })
    @IsOptional()
    @IsString()
    adminNotes?: string;
}
