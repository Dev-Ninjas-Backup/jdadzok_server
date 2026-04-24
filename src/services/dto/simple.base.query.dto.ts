import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsJSON, IsOptional, IsString } from "class-validator";

/**
 * @description
 * Base DTO for constructing dynamic Prisma queries.
 * This class should be extended by other DTOs to add model-specific properties.
 */
export class SimpleBaseQueryDto {
    @ApiProperty({
        required: false,
        description: "Traditional pagination: the number of records to skip.",
        example: 0,
    })
    @IsOptional()
    @Type(() => Number)
    skip?: number;

    @ApiProperty({
        required: false,
        description: "Traditional pagination: the number of records to return.",
        example: 10,
    })
    @IsOptional()
    @Type(() => Number)
    take?: number;

    @ApiProperty({
        required: false,
        description: "Cursor-based pagination: unique identifier to start from.",
        example: "clx0j2f3n0000j6n3f2f0a1d4",
    })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiProperty({
        required: false,
        description: 'Fields to sort by, e.g., "id:asc", "createdAt:desc".',
        isArray: true,
        example: ["createdAt:desc", "title:asc"],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    order?: string[];

    @ApiProperty({
        required: false,
        description: "A search term to query against multiple fields.",
        example: "dynamic search",
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({
        required: false,
        description:
            'Fields to search within, e.g., "title", "content". Must be a JSON array string.',
        isArray: true,
        example: '["title", "content"]',
    })
    @IsOptional()
    @IsJSON()
    searchFields?: string;

    @ApiProperty({
        required: false,
        description: 'Nested includes as a JSON string. e.g., \'{"author": true, "tags": true}\'',
        example: '{"author": true, "comments": { "include": { "author": true }}}',
    })
    @IsOptional()
    @IsJSON()
    include?: string;

    @ApiProperty({
        required: false,
        description:
            'Fields to select as a JSON string. e.g., \'{"id": true, "title": true, "author": { "select": { "name": true }}}\'',
        example: '{"id": true, "title": true, "author": { "select": { "name": true }}}',
    })
    @IsOptional()
    @IsJSON()
    select?: string;
}
