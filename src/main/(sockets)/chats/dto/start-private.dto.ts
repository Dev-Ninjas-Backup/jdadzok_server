// dto/start-private.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";
// dto/pagination.dto.ts
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
// dto/create.message.dto.ts

import { LiveMediaType } from "@prisma/client";

export class StartPrivateChatDto {
    @ApiProperty({
        description: "ID of the user to chat with",
        example: "550e8400-e29b-41d4-a716-446655440000",
    })
    @IsNotEmpty()
    @IsUUID()
    otherUserId: string;
}

// ============================================================================

export class CreateMessageDto {
    @ApiProperty({
        description: "Message content",
        example: "Hello, how are you?",
    })
    @IsNotEmpty()
    @IsString()
    content: string;

    @ApiPropertyOptional({
        description: "URL to media file (image, video, etc.)",
        example: "https://example.com/media/image.jpg",
    })
    @IsOptional()
    @IsString()
    mediaUrl?: string;

    @ApiPropertyOptional({
        description: "Type of media",
        enum: LiveMediaType,
        example: "IMAGE",
    })
    @IsOptional()
    @IsEnum(LiveMediaType)
    mediaType?: LiveMediaType;
}

// ============================================================================

export class MessagePaginationDto {
    @ApiPropertyOptional({
        description: "Cursor for pagination (message ID)",
        example: "550e8400-e29b-41d4-a716-446655440000",
    })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiPropertyOptional({
        description: "Number of messages to fetch",
        example: 20,
        minimum: 1,
        maximum: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    take?: number = 20;
}
