// import { ApiProperty, IntersectionType } from "@nestjs/swagger";
// import { IsUUID } from "class-validator";

// class CreateShare {
//     @ApiProperty({
//         example: "user-uuid-here",
//         description: "User ID who shared",
//         type: String,
//         format: "uuid",
//     })
//     @IsUUID()
//     user_id: string;

//     @ApiProperty({
//         example: "post-uuid-here",
//         description: "Post ID being shared",
//         type: String,
//         format: "uuid",
//     })
//     @IsUUID()
//     post_id: string;
// }
// export class CreateShareDto extends IntersectionType(CreateShare) {}

import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class CreateShareDto {
    @ApiProperty({
        example: "82c6a3c7-5db4-4a5d-9b0e-123456789abc",
        description: "The post being shared",
        type: String,
        format: "uuid",
    })
    @IsUUID()
    postId: string;
}
