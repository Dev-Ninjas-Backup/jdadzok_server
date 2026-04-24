import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ChangedPasswordDto {
    @ApiProperty({
        example: "pass123",
    })
    @IsNotEmpty()
    @IsString()
    currentPassword: string;

    @ApiProperty({
        example: "newPass123",
    })
    @IsNotEmpty()
    @IsString()
    newPassword: string;
}
