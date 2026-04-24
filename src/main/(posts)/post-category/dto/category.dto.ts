import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreatePostCategoryDto {
    @ApiProperty({
        example: "Technology News",
        description: "Name of the category",
        type: String,
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        example: "technology-news",
        description: "Optional slug for the category",
        type: String,
        required: false,
    })
    @IsString()
    @IsOptional()
    slug?: string;
}

export class UpdateCategoryDto {
    @ApiProperty({
        example: "Tech",
        description: "Updated name of the category",
        type: String,
        required: false,
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        example: "tech",
        description: "Updated slug for the category",
        type: String,
        required: false,
    })
    @IsOptional()
    @IsString()
    slug?: string;
}
