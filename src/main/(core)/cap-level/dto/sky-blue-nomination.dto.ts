import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class NominateSkyBlueDto {
    @ApiProperty({ description: "User ID to invite onto the Sky Blue track" })
    @IsUUID()
    nomineeId: string;

    @ApiPropertyOptional({ description: "Committee / nominator notes" })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string;
}

export class SkyBlueVerificationDto {
    @ApiPropertyOptional({ description: "Verification notes for audit trail" })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string;
}

export class SkyBlueDecisionDto {
    @ApiPropertyOptional({ description: "Decision notes for audit trail" })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string;
}
