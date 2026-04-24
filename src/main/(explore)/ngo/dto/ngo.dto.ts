import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { CommunityType } from "@prisma/client";
import { IsDateString, IsEnum, IsISO8601, IsOptional, IsString } from "class-validator";

export class NgoProfileDto {
    @ApiProperty({ description: "NGO name", example: "Helping Hands" })
    @IsString()
    name: string;

    @ApiProperty({ description: "Unique username", example: "helping_hands" })
    @IsString()
    username: string;

    @ApiProperty({
        description: "NGO tagline",
        example: "We help communities",
        required: false,
    })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiProperty({
        description: "NGO bio",
        example: "A non-profit organization helping people",
        required: false,
    })
    @IsOptional()
    @IsString()
    bio?: string;

    @ApiProperty({
        description: "Avatar/logo URL",
        example: "https://example.com/avatar.png",
        required: false,
    })
    @IsOptional()
    @IsString()
    avatarUrl?: string;

    @ApiProperty({
        description: "Cover image URL",
        example: "https://example.com/cover.png",
        required: false,
    })
    @IsOptional()
    @IsString()
    coverUrl?: string;

    @ApiProperty({
        description: "Location",
        example: "Dhaka, Bangladesh",
        required: false,
    })
    @IsOptional()
    @IsString()
    location?: string;
}

// Ngo about dto....
export class NgoAboutDto {
    @ApiProperty({
        description: "Detailed location",
        example: "Dhaka, Bangladesh",
        required: false,
    })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiProperty({
        description: "Date when the community was founded",
        example: "2020-06-15T00:00:00.000Z",
        required: false,
        type: String,
        format: "date-time",
    })
    @IsOptional()
    @IsISO8601({ strict: true })
    foundingDate?: string;

    @ApiProperty({
        description: "NGO mission statement",
        example: "Helping people in need",
        required: false,
    })
    @IsOptional()
    @IsString()
    mission?: string;

    @ApiProperty({
        description: "NGO website URL",
        example: "https://helpinghands.org",
        required: false,
    })
    @IsOptional()
    @IsString()
    website?: string;
}

export class CreateNgoDto {
    @ApiProperty({
        description: "Date when the community was founded",
        example: "2024-09-01T00:00:00.000Z",
    })
    @IsDateString()
    foundationDate: string;

    @ApiProperty({ description: "Type of NGO", example: CommunityType.PUBLIC })
    @IsEnum(CommunityType)
    ngoType: CommunityType;

    @ApiProperty({
        description: "NGO profile info",
        type: () => NgoProfileDto,
        required: false,
    })
    @IsOptional()
    profile?: NgoProfileDto;

    @ApiProperty({
        description: "Extended NGO info",
        type: () => NgoAboutDto,
        required: false,
    })
    @IsOptional()
    about?: NgoAboutDto;
}

// update dtos
export class UpdateNgoDto extends PartialType(
    OmitType(CreateNgoDto, ["foundationDate"] as const),
) {}
