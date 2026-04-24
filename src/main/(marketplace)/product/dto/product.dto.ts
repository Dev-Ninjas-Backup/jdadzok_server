import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
    IsBoolean,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    IsUUID,
} from "class-validator";

export class CreateProductDto {
    @ApiProperty({
        example: "3543c671-a22e-415d-9a0e-2c1c51a27d32",
        description: "Category ID",
        required: false,
    })
    @IsUUID()
    categoryId: string;

    @ApiProperty({
        example: "Wireless Bluetooth Headphones",
        description: "Title of the product",
        type: String,
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        example: "High-quality wireless headphones with noise cancellation",
        description: "Detailed description of the product",
        type: String,
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        example: 199.99,
        description: "Price of the product",
        type: Number,
    })
    @IsNumber()
    price: number;

    @ApiProperty({
        example: [
            "https://example.com/product-image1.png",
            "https://example.com/product-image2.png",
        ],
        description: "List of digital file URLs or product image URLs",
        type: [String],
        required: false,
    })
    @IsOptional()
    @IsUrl({}, { each: true })
    digitalFileUrl?: string[];

    @ApiProperty({ example: true, description: "Is product visible" })
    @IsOptional()
    @IsBoolean()
    isVisible?: boolean;

    @ApiProperty({ example: 10, description: "Available stock quantity" })
    @IsNotEmpty()
    @IsNumber()
    availability: number;

    @ApiProperty({
        example: "Dhaka, Bangladesh",
        description: "Product location",
    })
    @IsNotEmpty()
    @IsString()
    location: string;
}
export class updateProductDto extends PartialType(CreateProductDto) {
    @ApiProperty({
        example: "Updated Wireless Bluetooth Headphones",
        description: "Title of the product (required for update)",
        type: String,
    })
    @IsString()
    @IsNotEmpty()
    title: string;
}
