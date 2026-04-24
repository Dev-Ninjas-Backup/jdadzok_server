import { IsNumber, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class GetOrganizationsQueryDto {
    @ApiPropertyOptional({
        description: "Search by NGO or Community title",
        example: "Save The Children",
    })
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ description: "Page number for pagination", example: 1 })
    @IsOptional()
    @IsNumber()
    page?: number;

    @ApiPropertyOptional({ description: "Number of items per page", example: 10 })
    @IsOptional()
    @IsNumber()
    limit?: number;
}
