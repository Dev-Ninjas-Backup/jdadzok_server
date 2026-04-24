import { ApiProperty, IntersectionType, PartialType } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

class CreatePostTagUser {
    @ApiProperty({
        example: "d83f3f93-4e1a-40f4-bb82-0a9c251a9b5d",
        description: "ID of the post where the user is being tagged",
        type: String,
        format: "uuid",
    })
    @IsUUID()
    postId: string;

    @ApiProperty({
        example: "b23c2c3f-58c6-41c7-bd3e-3241b7d82a49",
        description: "ID of the user being tagged in the post",
        type: String,
        format: "uuid",
    })
    @IsUUID()
    userId: string;
}

export class CreatePostTagUserDto extends IntersectionType(CreatePostTagUser) {}
export class UpdatePostTagUserDto extends PartialType(IntersectionType(CreatePostTagUser)) {}
