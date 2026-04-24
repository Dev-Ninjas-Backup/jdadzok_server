import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UpdateCommentDto {
    @ApiProperty({
        example: "Updated comment text",
        description: "Updated comment text",
        type: String,
        required: false,
    })
    @IsOptional()
    @IsString()
    text?: string;
}
