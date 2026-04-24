import {
    ApiHideProperty,
    ApiProperty,
    ApiPropertyOptional,
    IntersectionType,
} from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { MediaType } from "@prisma/client";

export class CreateComment {
    @ApiProperty({
        example: "82c6a3c7-5db4-4a5d-9b0e-123456789abc",
        description: "Post ID where the comment is made",
        type: String,
        format: "uuid",
    })
    @IsUUID()
    postId: string;

    @ApiPropertyOptional({
        example: "b85f1c7e-2d36-4d5f-95d1-abcdef123456",
        description: "Optional parent comment ID (for nested replies)",
        type: String,
        format: "uuid",
        required: false,
    })
    @IsOptional()
    @IsUUID()
    parentCommentId?: string;

    @ApiHideProperty()
    @ApiProperty({
        example: "8f1b2c3d-4e5f-6789-abcd-1234567890ef",
        description: "Author ID of the comment",
        type: String,
        format: "uuid",
    })
    @IsOptional()
    @IsUUID()
    authorId: string;

    @ApiProperty({
        example: "This is a comment",
        description: "Comment text",
        type: String,
    })
    @IsString()
    @IsNotEmpty()
    text: string;

    @ApiPropertyOptional({
        example: "https://example.com/image.jpg",
        description: "Optional media URL attached to the comment",
        type: String,
        required: false,
        nullable: true,
    })
    @IsOptional()
    @IsString()
    mediaUrl?: string;

    @ApiPropertyOptional({
        description: "Type of media attached to the comment",
        enum: MediaType,
        example: MediaType.IMAGE,
        required: false,
    })
    @IsOptional()
    @IsEnum(MediaType)
    mediaType?: MediaType = MediaType.IMAGE;
}

export class CreateCommentDto extends IntersectionType(CreateComment) {}
