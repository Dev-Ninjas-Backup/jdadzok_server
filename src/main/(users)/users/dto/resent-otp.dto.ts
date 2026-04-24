import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class ResentOtpDto {
    @ApiProperty({
        example: "devlopersabbir@gmail.com",
    })
    @IsEmail()
    email: string;
}
