import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min } from "class-validator";
import { Transform, Type } from "class-transformer";

export class AllUserQueryDto {
    @ApiPropertyOptional({
        example: "rana",
        description: "Search by email, name, username, title, bio, location",
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    search?: string;

    @ApiPropertyOptional({ example: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ example: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}
