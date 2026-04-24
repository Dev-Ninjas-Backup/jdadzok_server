import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class NgoQueryDto {
    @ApiProperty({
        description: "Title of the ngo",
        example: "Software Engineer",
        required: false,
    })
    @IsOptional()
    @IsString()
    title: string;

    @ApiProperty({
        description: "Biography of the ngo",
        example: "Passionate developer and tech enthusiast.",
        required: false,
    })
    @IsOptional()
    @IsString()
    bio: string;

    @ApiProperty({
        description: "location",
        example: "New York, USA",
        required: false,
    })
    @IsOptional()
    @IsString()
    location?: string;
}
