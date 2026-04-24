import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsEnum, IsString, IsNumber } from "class-validator";
import { Feelings } from "@prisma/client";

export class PostQueryDto {
    @ApiProperty({ required: false, default: 1, type: Number })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    page?: number = 1;

    @ApiProperty({ required: false, default: 10, type: Number })
    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    limit?: number = 10;

    @ApiProperty({ required: false, default: false, type: Boolean })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === "true" || value === true)
    metadata?: boolean;

    @ApiProperty({ required: false, default: false, type: Boolean })
    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === "true" || value === true)
    author?: boolean;

    @ApiProperty({
        required: false,
        type: String,
        description: "Search by post text or author name",
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({
        required: false,
        enum: Feelings,
        isArray: true,
        description: "Filter posts by feelings",
    })
    @IsOptional()
    @IsEnum(Feelings, { each: true })
    feelings?: Feelings[];
}
