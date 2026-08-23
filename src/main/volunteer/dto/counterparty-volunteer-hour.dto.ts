import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ConfirmCounterpartyHourDto {
    @ApiProperty({
        required: false,
        example: "Yes, we completed a 1-hour mentoring session.",
        description: "Optional note from the mentee confirming the session",
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    confirmationNote?: string;
}

export class RejectCounterpartyHourDto {
    @ApiProperty({
        required: false,
        example: "This session did not take place.",
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    rejectionNote?: string;
}
