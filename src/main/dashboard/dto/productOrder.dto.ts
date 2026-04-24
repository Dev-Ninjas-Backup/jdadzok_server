// src/main/dashboard/dto/product-orders.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ProductOrderDto {
    @ApiProperty()
    productId: string;

    @ApiProperty()
    productTitle: string;

    @ApiProperty()
    sellerId: string;

    @ApiProperty()
    sellerName: string | null;

    @ApiProperty()
    sellerEmail: string;

    @ApiProperty()
    orderId: string;

    @ApiProperty()
    orderAmount: number;

    @ApiProperty()
    orderDate: Date;

    @ApiProperty()
    totalEarnedBySeller: number;
}

export class ProductOrderSearchDto {
    @ApiProperty({ description: "Search by seller name", required: false })
    @IsOptional()
    @IsString()
    sellerName?: string;
}
