import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CapLevel } from "@prisma/client";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class TalentSearchQueryDto {
    @ApiPropertyOptional({ description: "Search name, username, title, or bio" })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    q?: string;

    @ApiPropertyOptional({ description: "Filter by location substring" })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    location?: string;

    @ApiPropertyOptional({
        enum: CapLevel,
        description: "Minimum Cap level for candidates",
    })
    @IsOptional()
    @IsEnum(CapLevel)
    minCapLevel?: CapLevel;

    @ApiPropertyOptional({
        description: "Only members who opted into volunteer/mentor activities",
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    mentorOptInOnly?: boolean;
}

export class UnlockTalentCandidateDto {
    @ApiPropertyOptional({
        description: "Admin only — unlock on behalf of a corporate membership",
    })
    @IsOptional()
    @IsUUID()
    corporateMembershipId?: string;

    @ApiProperty({ description: "Candidate member user id to unlock" })
    @IsUUID()
    candidateUserId: string;
}
