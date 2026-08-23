import { ApiProperty } from "@nestjs/swagger";
import { ContributionType } from "@prisma/client";
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from "class-validator";

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

    @ApiProperty({
        enum: ContributionType,
        example: ContributionType.PROJECT,
        description: "Contribution category. OTHER requires contributionOther free-text.",
    })
    @IsEnum(ContributionType)
    contributionType: ContributionType;

    @ApiProperty({
        required: false,
        example: "Community garden weekend shift",
        description: "Required when contributionType is OTHER",
    })
    @ValidateIf((o: LogHoursDto) => o.contributionType === ContributionType.OTHER)
    @IsString()
    @MaxLength(500)
    contributionOther?: string;

    @ApiProperty({
        required: false,
        example: "uuid-of-mentee-user",
        description:
            "Required when contributionType is MENTORING or ADVICE — the mentee / recipient who must confirm the session",
    })
    @ValidateIf(
        (o: LogHoursDto) =>
            o.contributionType === ContributionType.MENTORING ||
            o.contributionType === ContributionType.ADVICE,
    )
    @IsUUID()
    counterpartyUserId?: string;
}
