import { ApiProperty, IntersectionType } from "@nestjs/swagger";
import { IsArray, IsUUID } from "class-validator";

class BulkCreatePostTags {
    @ApiProperty({
        example: "d83f3f93-4e1a-40f4-bb82-0a9c251a9b5d",
        description: "Post ID",
        type: String,
        format: "uuid",
    })
    @IsUUID()
    post_id: string;

    @ApiProperty({
        example: ["b23c2c3f-58c6-41c7-bd3e-3241b7d82a49", "e92d5ec2-9046-4f90-9412-cd26dcf2d213"],
        description: "Array of user IDs to tag in the post",
        type: [String],
        format: "uuid",
    })
    @IsArray()
    @IsUUID("all", { each: true })
    user_ids: string[];
}
export class BulkCreatePostTagsDto extends IntersectionType(BulkCreatePostTags) {}
