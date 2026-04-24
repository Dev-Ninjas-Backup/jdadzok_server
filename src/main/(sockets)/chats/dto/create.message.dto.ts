import { LiveMediaType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUrl } from "class-validator";

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
}
