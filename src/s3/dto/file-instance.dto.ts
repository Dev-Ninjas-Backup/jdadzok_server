import { ApiProperty, IntersectionType, PartialType } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, IsUUID, IsUrl } from "class-validator";

export class FileInstanceDto {
    @ApiProperty({ example: "generated-file-123.png", required: false })
    @IsOptional()
    @IsString()
    filename?: string;

    @ApiProperty({ example: "profile.png", required: false })
    @IsOptional()
    @IsString()
    originalFilename?: string;

    @ApiProperty({ example: "/uploads/profile/profile.png", required: false })
    @IsOptional()
    @IsString()
    path?: string;

    @ApiProperty({ example: "https://cdn.jdadzok.com/uploads/profile/profile.png" })
    @IsUrl()
    url!: string;

    @ApiProperty({ example: "png", required: false })
    @IsOptional()
    @IsString()
    fileType?: string;

    @ApiProperty({ example: "image/png", required: false })
    @IsOptional()
    @IsString()
    mimeType?: string;

    @ApiProperty({ example: 204800, required: false, description: "File size in bytes" })
    @IsOptional()
    @IsNumber()
    size?: number;

    @ApiProperty({ example: "c3f8d2b4-1f6b-4f9d-a8e3-7e9b47a8c712", required: false })
    @IsOptional()
    @IsUUID()
    uploadedById?: string;
}

export class UpdateFileInstanceDto extends PartialType(FileInstanceDto) {}

export class FileInstanceResponseDto {
    @ApiProperty({ example: "uuid" })
    id!: string;

    @ApiProperty({ example: "generated-file-123.png" })
    filename?: string;

    @ApiProperty({ example: "profile.png" })
    originalFilename?: string;

    @ApiProperty({ example: "/uploads/profile/profile.png" })
    path?: string;

    @ApiProperty({ example: "https://cdn.jdadzok.com/uploads/profile/profile.png" })
    url!: string;

    @ApiProperty({ example: "png" })
    fileType?: string;

    @ApiProperty({ example: "image/png" })
    mimeType?: string;

    @ApiProperty({ example: 204800 })
    size?: number;

    @ApiProperty({ example: "2025-10-28T12:00:00Z" })
    createdAt!: Date;

    @ApiProperty({ example: "2025-10-28T12:10:00Z" })
    updatedAt!: Date;
}

export class FileInstancesResponseDto extends IntersectionType(FileInstanceDto) {}
