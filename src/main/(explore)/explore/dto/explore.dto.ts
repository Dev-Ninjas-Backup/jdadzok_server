import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ExploreDto {
    @ApiPropertyOptional({ description: "Search term for name, username or title" })
    @IsOptional()
    @IsString()
    search?: string;
}
