import { ApiPropertyOptional } from "@nestjs/swagger";
import { CapArtPlacement, CapArtStyle } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

export class CapArtPreferencesDto {
    @ApiPropertyOptional({
        enum: CapArtStyle,
        example: CapArtStyle.STRUCTURED,
        description: "Illustrated cap rendering style: structured (crisp) or soft (rounded)",
    })
    @IsOptional()
    @IsEnum(CapArtStyle)
    capArtStyle?: CapArtStyle;

    @ApiPropertyOptional({
        enum: CapArtPlacement,
        example: CapArtPlacement.BESIDE,
        description:
            "Cap placement on profile: worn on avatar or beside photo (default beside for inclusivity)",
    })
    @IsOptional()
    @IsEnum(CapArtPlacement)
    capArtPlacement?: CapArtPlacement;
}
