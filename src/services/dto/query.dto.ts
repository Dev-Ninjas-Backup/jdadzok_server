import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from "class-validator";
import { OrderDirection } from "../@types";

export class BaseQueryDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    page?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @IsPositive()
    limit?: number;

    @ApiProperty({ required: false, description: "Search term" })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({
        required: false,
        description: "Sort by field",
        default: "createdAt",
    })
    @IsOptional()
    @IsString()
    sortBy?: string;

    @ApiProperty({
        required: false,
        description: "Sort order",
        enum: ["asc", "desc"],
        default: "desc",
    })
    @IsOptional()
    @IsEnum(["asc", "desc"])
    order?: OrderDirection;
}
