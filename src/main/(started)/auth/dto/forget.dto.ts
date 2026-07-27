import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

class ForgetPassword {
    @ApiProperty({
        example: "softvence@saikat.com.bd",
    })
    @IsEmail()
    email: string;
}
export class ForgetPasswordDto extends IntersectionType(ForgetPassword) {}
