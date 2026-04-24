import { ApiProperty, IntersectionType, PartialType } from "@nestjs/swagger";
import { IsString } from "class-validator";

class TermsAndConditionsDto {
    @ApiProperty({ example: "Your terms and conditions text here..." })
    @IsString()
    text: string;
}

export class CreateTermsAndConditionsDto extends IntersectionType(TermsAndConditionsDto) {}
export class UpdateTermsAndConditionsDto extends IntersectionType(
    PartialType(TermsAndConditionsDto),
) {}
