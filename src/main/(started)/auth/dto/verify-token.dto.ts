import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { IsString, IsUUID } from "class-validator";

class VerifyToken {
    @ApiProperty({
        example: "234222",
    })
    @IsString()
    token: string;

    @ApiProperty({
        example: "user uuid",
    })
    @IsUUID()
    userId: string;
}
export class VerifyTokenDto extends IntersectionType(VerifyToken) {}
