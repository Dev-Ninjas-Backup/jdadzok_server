import { ApiProperty, IntersectionType, PartialType } from "@nestjs/swagger";
import { IsString } from "class-validator";

class PrivacyPolicyDto {
    @ApiProperty({ example: "Your privacy policy text here..." })
    @IsString()
    text: string;
}

export class CreatePrivacyPolicyDto extends IntersectionType(PrivacyPolicyDto) {}
export class UpdatePrivacyPolicyDto extends IntersectionType(PartialType(PrivacyPolicyDto)) {}
