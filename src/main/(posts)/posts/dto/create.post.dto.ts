import { ApiProperty, IntersectionType, PartialType, ApiHideProperty } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
} from "class-validator";
import { mediaType, postFrom, postVisibility, PostVisibility, PostForm } from "@constants/enums";
import {
    CreatePostMetadataDto,
    CreatePostMetadata,
} from "@module/(posts)/post-metadata/dto/post.metadata.dto";
import { MediaType } from "@prisma/client";

export class CreatePost {
    @ApiHideProperty()
    @IsUUID()
    @IsOptional()
    authorId?: string;

    @ApiProperty({ example: "This is my first post!", required: false })
    @IsOptional()
    @IsString()
    text?: string;

    @ApiProperty({ example: ["https://example.com/image.jpg"], required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    mediaUrls?: string[];

    @ApiProperty({ enum: mediaType, example: "IMAGE", required: false })
    @IsOptional()
    @IsEnum(MediaType)
    mediaType?: MediaType | null;

    @ApiProperty({ enum: postVisibility, example: "PUBLIC", required: false })
    @IsOptional()
    @IsEnum(postVisibility)
    visibility?: PostVisibility;

    @ApiProperty({ example: ["uuid-of-tagged-user"], required: false })
    @IsOptional()
    @Transform(({ value }) => (typeof value === "string" ? JSON.parse(value) : value))
    @IsArray()
    @IsUUID("all", { each: true })
    taggedUserIds?: string[];

    @ApiProperty({ type: CreatePostMetadataDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreatePostMetadata)
    metadata?: CreatePostMetadata;

    @ApiHideProperty()
    @IsOptional()
    @IsUUID()
    metadataId?: string;

    @ApiProperty({ enum: postFrom, example: "REGULAR_PROFILE", required: true })
    @IsEnum(postFrom)
    postFrom!: PostForm;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUUID()
    communityId?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUUID()
    ngoId?: string;

    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @Transform(({ value }) => value === "true" || value === true)
    @IsBoolean()
    acceptVolunteer?: boolean;

    @ApiProperty({ example: false, required: false })
    @IsOptional()
    @Transform(({ value }) => value === "true" || value === true)
    @IsBoolean()
    acceptDonation?: boolean;
}

export class CreatePostDto extends IntersectionType(CreatePost) {}
export class UpdatePostDto extends PartialType(CreatePost) {}
