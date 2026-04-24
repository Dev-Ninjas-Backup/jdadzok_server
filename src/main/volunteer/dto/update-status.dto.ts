import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApplicationStatus } from "@prisma/client";

export class UpdateStatusDto {
    @ApiProperty({ enum: ApplicationStatus })
    @IsEnum(ApplicationStatus)
    status: ApplicationStatus;

    @ApiProperty({ example: "Volunteer completed all assigned tasks.", required: false })
    @IsOptional()
    @IsString()
    completionNote?: string;
}
