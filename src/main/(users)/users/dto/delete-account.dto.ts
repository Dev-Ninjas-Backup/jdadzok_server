import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Length } from "class-validator";

export class DeleteAccountDto {
    @ApiPropertyOptional({
        description: "Required for EMAIL auth users (unless 2FA is enabled)",
        example: "currentPassword123",
    })
    @IsOptional()
    @IsString()
    currentPassword?: string;

    @ApiPropertyOptional({
        description: "Required when two-factor authentication is enabled",
        example: "123456",
    })
    @IsOptional()
    @IsString()
    @Length(6, 6)
    totpCode?: string;
}
