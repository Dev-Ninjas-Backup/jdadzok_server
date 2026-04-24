import { IsBoolean, IsOptional, IsEnum } from "class-validator";
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
}
