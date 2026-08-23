import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class EndorseVolunteerHourDto {
    @ApiProperty({
        required: false,
        example: "Great mentoring session — well documented hours.",
        description: "Optional endorsement message stored on the linked Endorsement record",
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    message?: string;
}

export class RejectVolunteerHourDto {
    @ApiProperty({
        required: false,
        example: "Hours overlap with another verified entry.",
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    rejectionNote?: string;
}
