import { ApiPropertyOptional, IntersectionType, PartialType } from "@nestjs/swagger";
import { Gender } from "@prisma/client";
import { IsBoolean, IsEnum, IsISO8601, IsOptional, IsString, IsUrl } from "class-validator";

class UserProfile {
    @ApiPropertyOptional({ example: "John Doe" })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: "john_doe" })
    @IsOptional()
    @IsString()
    username?: string;

    @ApiPropertyOptional({ example: "Software Engineer" })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional({ example: "Loves TypeScript and NestJS" })
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiPropertyOptional({ example: "https://example.com/avatar.png" })
    @IsOptional()
    @IsUrl()
    avatarUrl?: string;

    @ApiPropertyOptional({ example: "https://example.com/cover.jpg" })
    @IsOptional()
    @IsUrl()
    coverUrl?: string;

    @ApiPropertyOptional({ example: "New York, USA" })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ example: false })
    @IsOptional()
    @IsBoolean()
    isToggleNotification?: boolean;

    @ApiPropertyOptional({ example: "1995-10-10T00:00:00.000Z" })
    @IsOptional()
    @IsISO8601()
    dateOfBirth?: string;

    @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
    @IsOptional()
    @IsEnum(Gender)
    gender?: Gender;

    @ApiPropertyOptional({ example: "5 years in full-stack development" })
    @IsOptional()
    @IsString()
    experience?: string;
}

export class CreateUserProfileDto extends IntersectionType(UserProfile) {}
export class UpdateUserProfileDto extends PartialType(IntersectionType(UserProfile)) {}
