import { feelings, Feelings } from "@constants/enums";
import { ApiHideProperty, ApiProperty, IntersectionType, PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsOptional, IsUUID, ValidateNested } from "class-validator";
import { CreateGifDto } from "../../gif/dto/create.gif.dto";
import { CreateLocationDto } from "../../locations/dto/create.location.dto";

export class CreatePostMetadata {
    @ApiProperty({
        enum: feelings,
        example: "HAPPY",
        description: "Feeling associated with the post",
        required: false,
    })
    @IsOptional()
    @IsEnum(feelings)
    feelings?: Feelings;

    @ApiProperty({
        description: "Check-in location for the post",
        type: CreateLocationDto,
        required: false,
    })
    @IsOptional()
    @ValidateNested({
        each: true,
    })
    @Transform(({ value }) => {
        if (!value) return undefined;
        try {
            return typeof value === "string" ? JSON.parse(value) : value;
        } catch {
            return undefined;
        }
    })
    @Type(() => CreateLocationDto)
    checkIn?: CreateLocationDto;

    @ApiHideProperty()
    @IsOptional()
    @IsUUID()
    checkInId?: string;

    @ApiProperty({
        description: "GIF attached to the post",
        type: CreateGifDto,
        required: false,
    })
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CreateGifDto)
    gif?: CreateGifDto;

    @ApiHideProperty()
    @IsOptional()
    @IsUUID()
    gifId?: string;
}

export class CreatePostMetadataDto extends CreatePostMetadata {}
export class UpdatePostMetadataDto extends PartialType(IntersectionType(CreatePostMetadata)) {}
