import { IsOptional, IsString, IsNumber, Min, IsIn, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class ProductQueryDto {
    @ApiPropertyOptional({
        description: "Search by product title or seller name",
        example: "water bottle",
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: "Page number", example: 1, default: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: "Items per page", example: 10, default: 10 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({ description: "Filter by product status", example: "CONTINUED" })
    @IsOptional()
    @IsIn(["CONTINUED", "SOLDOUT", "DISCONTINUED"])
    status?: "CONTINUED" | "SOLDOUT" | "DISCONTINUED";

    @ApiPropertyOptional({ description: "Only featured products", example: true })
    @IsOptional()
    @IsBoolean()
    featured?: boolean;
}
