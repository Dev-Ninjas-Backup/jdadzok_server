import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsPositive, IsUUID } from "class-validator";

export class PaginationDto {
    @ApiProperty({
        example: 10,
        required: false,
    })
    @IsNumber()
    @IsPositive()
    @IsOptional()
    limit: number;

    @ApiProperty({
        example: "last_uuid",
        required: false,
    })
    @IsUUID()
    @IsOptional()
    cursor?: string;
}
