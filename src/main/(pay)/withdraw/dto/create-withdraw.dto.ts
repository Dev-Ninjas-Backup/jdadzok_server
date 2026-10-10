import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsPositive } from "class-validator";

export class CreateWithdrawDto {
    @ApiProperty({ description: "Amount in USD to withdraw", example: 100 })
    @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
    @IsPositive()
    amount: number;
}
