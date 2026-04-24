// community.dto.ts
import { ApiProperty, OmitType, PartialType } from "@nestjs/swagger";
import { IsString, IsOptional, IsEnum, IsDateString, IsISO8601 } from "class-validator";
import { CommunityType, CommunityRole } from "@prisma/client";

// ---------------- COMMUNITY PROFILE ----------------
export class CommunityProfileDto {
    @ApiProperty({
        description: "Community display name",
        example: "Tech Enthusiasts Club",
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: "Unique username/handle for the community",
        example: "tech_club",
    })
    @IsOptional()
    @IsString()
    username: string;

    @ApiProperty({
        description: "Short tagline or title of the community",
        example: "Exploring the Future of Technology",
    })
    @IsOptional()
    @IsString()
    title: string;

    @ApiProperty({
        description: "Detailed description or bio of the community",
        example:
            "A community of technology enthusiasts who share knowledge, organize events, and collaborate on projects.",
        required: false,
    })
    @IsOptional()
    bio?: string;

    @ApiProperty({
        description: "URL of the community avatar/logo",
        example: "https://example.com/images/community-logo.png",
        required: false,
    })
    @IsOptional()
    avatarUrl?: string;

    @ApiProperty({
        description: "URL of the community cover image",
        example: "https://example.com/images/community-cover.jpg",
        required: false,
    })
    @IsOptional()
    coverUrl?: string;

    @ApiProperty({
        description: "Location of the community",
        example: "Dhaka, Bangladesh",
        required: false,
    })
    @IsOptional()
    location?: string;
}

// ---------------- COMMUNITY ABOUT ----------------
export class CommunityAboutDto {
    @ApiProperty({
        description: "Detailed location of the community",
        example: "Sylhet, Bangladesh",
        required: false,
    })
    @IsOptional()
    location?: string;

    @ApiProperty({
        description: "Date when the community was founded",
        example: "2020-06-15T00:00:00.000Z", // ISO format
        required: false,
        type: String,
        format: "date-time",
    })
    @IsOptional()
    @IsISO8601({ strict: true })
    foundingDate?: string;

    @ApiProperty({
        description: "Community mission statement",
        example: "To promote innovation and collaboration in the field of renewable energy.",
        required: false,
    })
    @IsString()
    @IsOptional()
    mission?: string;

    @ApiProperty({
        description: "Official website of the community",
        example: "https://www.greenfuture.org",
        required: false,
    })
    @IsString()
    @IsOptional()
    website?: string;
}

// ---------------- COMMUNITIES MEMBERSHIP ----------------
export class CommunitiesMembershipDto {
    @ApiProperty({ description: "User ID of the member" })
    userId: string;

    @ApiProperty({ description: "Community ID of the membership" })
    communityId: string;

    @ApiProperty({
        description: "Role of the user in the community",
        enum: CommunityRole,
    })
    @IsEnum(CommunityRole)
    role: CommunityRole;
}

// ---------------- COMMUNITY ----------------
export class CreateCommunityDto {
    @ApiProperty({
        description: "Date when the community was founded",
        example: "2024-09-01T00:00:00.000Z",
    })
    @IsDateString()
    foundationDate: string;

    @ApiProperty({
        description: "Type of community",
        example: CommunityType.PUBLIC,
    })
    @IsEnum(CommunityType)
    communityType: CommunityType;

    @ApiProperty({
        description: "Community profile info",
        type: () => CommunityProfileDto,
        required: false,
    })
    @IsOptional()
    profile?: CommunityProfileDto;

    @ApiProperty({
        description: "Extended community info",
        type: () => CommunityAboutDto,
        required: false,
    })
    @IsOptional()
    about?: CommunityAboutDto;
}

// update dtos
export class UpdateCommunityDto extends PartialType(
    OmitType(CreateCommunityDto, ["foundationDate"] as const),
) {}

export class UpdateCommunitiesMembershipDto extends PartialType(CommunitiesMembershipDto) {}

export class UpdateCommunityAboutDto extends PartialType(CommunityAboutDto) {}

export class UpdateCommunityProfileDto extends PartialType(CommunityProfileDto) {}
