import { ApiProperty, IntersectionType, PartialType } from "@nestjs/swagger";
import { IsNotEmpty, IsUrl } from "class-validator";

class CreateGif {
    @ApiProperty({
        example: "https://giphy.com/gifs/example.gif",
        description: "GIF URL",
        type: String,
    })
    @IsUrl()
    @IsNotEmpty()
    url: string;
}
export class CreateGifDto extends IntersectionType(CreateGif) {}
export class UpdateGifDto extends PartialType(IntersectionType(CreateGif)) {}
