import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber } from "class-validator";

export class CreateAdminActivity {
    @ApiProperty({
        description: "set the score for like",
        example: 1,
    })
    @IsNumber()
    @IsNotEmpty()
    like: number;

    @IsNumber()
    @IsNotEmpty()
    @ApiProperty({
        description: "set the score for comment",
        example: 1,
    })
    comment: number;

    @ApiProperty({
        description: "set the score for share",
        example: 1,
    })
    @IsNumber()
    @IsNotEmpty({})
    share: number;

    @ApiProperty({
        description: "set the score for post",
        example: 1,
    })
    @IsNumber()
    @IsNotEmpty()
    post: number;

    @ApiProperty({
        description: "set the score for green cap",
        example: 1,
    })
    @IsNumber()
    @IsNotEmpty()
    greenCapScore: number;

    @ApiProperty({
        description: "set the score for red cap",
        example: 1,
    })
    @IsNumber()
    @IsNotEmpty()
    redCapScore: number;

    @ApiProperty({
        description: "set the score for black cap",
        example: 1,
    })
    @IsNumber()
    @IsNotEmpty()
    blackCapScore: number;

    @ApiProperty({
        description: "set the score for yellow cap",
        example: 1,
    })
    @IsNumber()
    @IsNotEmpty()
    yellowCapScore: number;

    @ApiProperty({
        description: "set the percentage for product spent",
        example: 1,
    })
    @IsNumber()
    @IsNotEmpty()
    productSpentPercentage: number;

    @ApiProperty({
        description: "set the percentage for product promotion",
        example: 2,
    })
    @IsNumber()
    @IsNotEmpty()
    productPromotionPercentage: number;
}
