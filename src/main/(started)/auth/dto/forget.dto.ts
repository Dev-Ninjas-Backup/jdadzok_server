import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

class ForgetPassword {
    @ApiProperty({
        example: "devlopersabbir@gmail.com",
    })
    @IsEmail()
    email: string;
}
export class ForgetPasswordDto extends IntersectionType(ForgetPassword) {}
