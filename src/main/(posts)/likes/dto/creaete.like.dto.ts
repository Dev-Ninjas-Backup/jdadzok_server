import { ApiHideProperty, ApiProperty, IntersectionType, PartialType } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

class CreateLike {
    @ApiHideProperty()
    @IsUUID()
    @IsOptional()
    userId?: string;

    @ApiProperty({
        example: "82c6a3c7-5db4-4a5d-9b0e-123456789abc",
        type: String,
        format: "uuid",
    })
    @IsUUID()
    postId: string;

    @ApiProperty({
        example: "82c6a3c7-5db4-4a5d-9b0e-123456789abc",
        type: String,
        format: "uuid",
    })
    @IsOptional()
    @IsUUID()
    commentId?: string;
}

export class CreateLikeDto extends IntersectionType(CreateLike) {}
export class UpdateLikeDto extends IntersectionType(PartialType(CreateLike)) {}
