import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CapLevel } from "@prisma/client";

export class UpdateCapLevelQueryDto {
    @ApiPropertyOptional({
        enum: CapLevel,
        example: "GREEN",
        description: "Target CapLevel to promote the user to",
    })
    @IsOptional()
    @IsEnum(CapLevel, { message: "Invalid targetLevel" })
    targetLevel?: CapLevel;

    @ApiPropertyOptional({
        example: true,
        description: "Bypass verification check",
    })
    @IsOptional()
    @IsBoolean()
    @Transform(({ value }) => value === "true" || value === "1")
    bypassVerification?: boolean = false;

    @ApiPropertyOptional({
        description: "Required when bypassVerification is true — audit trail",
    })
    @IsOptional()
    @IsString()
    bypassReason?: string;

    @ApiPropertyOptional({ description: "Admin review notes for audit trail" })
    @IsOptional()
    @IsString()
    reviewNotes?: string;
}
