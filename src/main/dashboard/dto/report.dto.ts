import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

export class ReportQueryDto {
    @ApiProperty({ required: false, default: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page = 1;

    @ApiProperty({ required: false, default: 10 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit = 10;
}
