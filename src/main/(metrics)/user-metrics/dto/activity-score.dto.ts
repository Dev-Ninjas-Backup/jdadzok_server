import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class CalculateActivityScoreDto {
    @ApiProperty({ example: "uuid-of-user", description: "User ID" })
    @IsUUID()
    userId: string;
}
