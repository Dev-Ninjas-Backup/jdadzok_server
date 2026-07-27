import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class ResentOtpDto {
    @ApiProperty({
        example: "softvence@saikat.com.bd",
    })
    @IsEmail()
    email: string;
}
