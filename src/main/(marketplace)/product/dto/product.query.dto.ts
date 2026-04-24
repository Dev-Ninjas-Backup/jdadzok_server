import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class ProductQueryDto {
    @ApiPropertyOptional({
        example: "headphones",
        description: "Search keyword for product title or description",
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        example: 100,
        description: "Minimum price filter",
    })
    @IsOptional()
    @IsNumber()
    minPrice?: number;

    @ApiPropertyOptional({
        example: 500,
        description: "Maximum price filter",
    })
    @IsOptional()
    @IsNumber()
    maxPrice?: number;

    @ApiPropertyOptional({ example: "Electronics", description: "Category name from frontend" })
    @IsOptional()
    @IsString()
    categoryName?: string;
}
