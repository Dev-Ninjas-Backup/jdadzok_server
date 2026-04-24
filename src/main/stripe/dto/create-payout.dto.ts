import { IsNumber, IsPositive } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePayoutDto {
    @ApiProperty({
        description: "The amount to payout to the seller",
        example: 100.5,
        type: Number,
    })
    @IsNumber()
    @IsPositive({ message: "Amount must be a positive number" })
    amount: number;
}
