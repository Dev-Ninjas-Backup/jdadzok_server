import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";

export class CreateWithdrawDto {
    @ApiProperty()
    @IsNumber()
    amount: number;
}
