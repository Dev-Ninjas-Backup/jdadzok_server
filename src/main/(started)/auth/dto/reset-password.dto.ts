import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID } from "class-validator";

class ResetPassword {
    @ApiProperty({
        example: "user_uuid",
    })
    @IsUUID()
    userId: string;

    @ApiProperty({
        example: "pass123",
    })
    @IsNotEmpty()
    @IsString()
    password: string;
}

export class ResetPasswordDto extends IntersectionType(ResetPassword) {}
