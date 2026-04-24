import { ApiProperty, IntersectionType, PartialType } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

class AboutUsDto {
    @ApiProperty({ type: [String], example: ["photo1.jpg", "photo2.jpg"] })
    @IsArray()
    @IsOptional()
    photos?: string[];

    @ApiProperty({ example: "This is some information about us." })
    @IsString()
    about: string;
}
export class CreateAboutUsDto extends IntersectionType(AboutUsDto) {}
export class UpdateAboutUsDto extends IntersectionType(PartialType(AboutUsDto)) {}
