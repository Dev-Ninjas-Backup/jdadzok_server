import { LiveMediaType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class CreateMessageDto {
    @IsString()
    @IsOptional()
    content?: string;

    @IsOptional()
    @IsUrl()
    mediaUrl?: string;

    @IsOptional()
    @IsEnum(LiveMediaType)
    mediaType?: LiveMediaType;

    /** Client-generated id so mobile retries do not duplicate the message. */
    @IsOptional()
    @IsString()
    @MaxLength(128)
    clientMessageId?: string;
}
