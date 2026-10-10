import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class SetAdRevenueOptInDto {
    @ApiProperty({
        description: "true to receive ad revenue, false to stop. Off by default for every member.",
        example: true,
    })
    @IsBoolean()
    optIn: boolean;
}
