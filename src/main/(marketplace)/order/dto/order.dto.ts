import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CreateOrderDto {
    @ApiProperty({
        description: "UUID of the product being ordered",
        example: "8a5a2e43-12fa-4893-bb74-08c5c21cb6a9",
    })
    @IsUUID()
    productId: string;

    @ApiProperty({
        description: "Quantity of the product ordered",
        example: 2,
        default: 1,
    })
    @IsInt()
    @Min(1)
    quantity: number;

    @ApiProperty({
        description: "Total price of the order (quantity × unit price)",
        example: 1999.99,
    })
    @IsNumber()
    totalPrice: number;

    @ApiProperty({
        description: "Full shipping address for delivery",
        example: "123 Main Street, Dhaka, Bangladesh",
        required: false,
    })
    @IsString()
    @IsOptional()
    shippingAddress?: string;

    @ApiProperty({
        description: "Tracking number provided by the shipping service",
        example: "TRACK123456BD",
        required: false,
    })
    @IsString()
    @IsOptional()
    trackingNumber?: string;
}

// export class UpdatedOrderDto {

// }
