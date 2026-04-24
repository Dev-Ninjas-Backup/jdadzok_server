import { ApiPropertyOptional } from "@nestjs/swagger";
import { OrderStatus } from "@prisma/client";
import { IsOptional, IsString, IsNumberString, IsEnum } from "class-validator";

export class OrderListQueryDto {
    @ApiPropertyOptional({
        enum: OrderStatus,
        description: "Filter orders by status",
        example: OrderStatus.PENDING,
    })
    @IsOptional()
    @IsEnum(OrderStatus)
    status?: OrderStatus;

    @ApiPropertyOptional({
        description: "Search by order ID or buyer name",
        example: "john",
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: "Page number",
        example: 1,
    })
    @IsOptional()
    @IsNumberString()
    page?: string;

    @ApiPropertyOptional({
        description: "Items per page",
        example: 10,
    })
    @IsOptional()
    @IsNumberString()
    limit?: string;
}
