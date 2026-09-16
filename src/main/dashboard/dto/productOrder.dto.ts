// src/main/dashboard/dto/product-orders.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OrderStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

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

    @ApiProperty()
    status: OrderStatus;
}

export class ProductOrderSearchDto {
    @ApiProperty({ description: "Search by seller name", required: false })
    @IsOptional()
    @IsString()
    sellerName?: string;

    @ApiPropertyOptional({
        description: "Filter by order status (defaults to PAID)",
        enum: OrderStatus,
    })
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;
}
