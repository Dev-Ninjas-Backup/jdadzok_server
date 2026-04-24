import { IsOptional, IsString, IsNumber, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class EventQueryDto {
    @ApiPropertyOptional({
        description: "Search events by project title or NGO name",
        example: "cleanup",
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: "Page number",
        example: 1,
        default: 1,
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: "Items per page",
        example: 10,
        default: 10,
    })
    @IsOptional()
    @IsNumber()
    @Min(1)
    limit?: number = 10;
}
