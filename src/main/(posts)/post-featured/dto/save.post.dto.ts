import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SavePostDto {
    @ApiProperty({
        description: "ID of the post to save or unsave",
        example: "a1b2c3d4-e5f6-7890-ab12-cd34ef567890",
    })
    @IsString()
    postId: string;
}
