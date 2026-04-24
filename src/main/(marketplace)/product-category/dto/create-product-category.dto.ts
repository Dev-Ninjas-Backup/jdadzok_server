import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateProductCategoryDto {
    @ApiProperty({
        example: "Electronics",
        description: "Name of the product category",
    })
    @IsString()
    name: string;

    @ApiProperty({
        example: "electronics",
        description: "Slug version of the category name (URL-friendly)",
    })
    @IsString()
    slug: string;

    @ApiProperty({
        example: "All kinds of electronic devices and gadgets",
        description: "Detailed description of the category",
        required: false,
    })
    @IsOptional()
    @IsString()
    description?: string;
}
