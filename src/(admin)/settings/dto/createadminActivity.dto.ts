import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, Min } from "class-validator";

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

    @ApiProperty({
        required: false,
        description: "Impact score: points per distinct endorser (scaled by the endorser's level)",
        example: 10,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    endorsement?: number;

    @ApiProperty({
        required: false,
        description: "Impact score: points per verified volunteer hour",
        example: 2,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    verifiedVolunteerHour?: number;

    @ApiProperty({
        required: false,
        description:
            "Impact score: points per follower (default 0, followers are a popularity metric)",
        example: 0,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    follower?: number;

    @ApiProperty({
        required: false,
        description:
            "Impact score: most points that post / comment / like / share / follower activity can add in total",
        example: 30,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    popularityCap?: number;

    @ApiProperty({
        required: false,
        description:
            "Impact score: extra endorsement multiplier per ladder rung of the endorser (Green 0 ... Black 3)",
        example: 0.5,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    endorserLevelBonus?: number;
}
