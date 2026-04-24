import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CreatePostDto } from "./create.post.dto";

export class UpdatePostDto extends PartialType(
    OmitType(CreatePostDto, ["authorId", "taggedUserIds", "metadata"] as const),
) {
    @ApiProperty({
        description: "Update the text content of the post",
        required: false,
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    text?: string;
}
