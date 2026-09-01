import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class TwoFactorCodeDto {
    @ApiProperty({ example: "123456", description: "6-digit authenticator code" })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    code: string;
}

export class TwoFactorLoginDto {
    @ApiProperty({ description: "Short-lived token returned when login requires MFA" })
    @IsString()
    @IsNotEmpty()
    mfaToken: string;

    @ApiProperty({ example: "123456" })
    @IsString()
    @IsNotEmpty()
    @Length(6, 6)
    code: string;
}
