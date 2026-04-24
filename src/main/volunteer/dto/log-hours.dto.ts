import { ApiProperty } from "@nestjs/swagger";
import { IsISO8601 } from "class-validator";

export class LogHoursDto {
    @ApiProperty({
        example: "2025-11-01T09:00:00Z",
        description: "The time when the volunteer started working (ISO 8601 format)",
    })
    @IsISO8601(
        {},
        {
            message:
                "checkInTime must be a valid ISO 8601 date string (e.g., 2025-11-01T09:00:00Z)",
        },
    )
    checkInTime: string;

    @ApiProperty({
        example: "2025-11-01T13:30:00Z",
        description: "The time when the volunteer finished working (ISO 8601 format)",
    })
    @IsISO8601(
        {},
        {
            message:
                "checkOutTime must be a valid ISO 8601 date string (e.g., 2025-11-01T13:30:00Z)",
        },
    )
    checkOutTime: string;
}
