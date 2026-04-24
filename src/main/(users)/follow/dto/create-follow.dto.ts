import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class CreateFollowDto {
    @ApiProperty({
        example: "82c6a3c7-5db4-4a5d-9b0e-123456789abc",
        description: "The user being followed",
        type: String,
        format: "uuid",
    })
    @IsUUID()
    followingId: string;
}
