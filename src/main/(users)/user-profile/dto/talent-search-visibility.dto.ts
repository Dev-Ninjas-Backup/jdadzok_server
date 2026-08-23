import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class TalentSearchVisibilityDto {
    @ApiProperty({
        example: true,
        description:
            "Allow your profile to appear in employer talent-sourcing searches (reputation-ranked)",
    })
    @IsBoolean()
    isTalentSearchOptIn: boolean;
}
