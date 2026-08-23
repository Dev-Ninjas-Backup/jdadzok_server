import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { MembershipTier } from "@prisma/client";
import {
    IsArray,
    IsBoolean,
    IsEmail,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    Max,
    Min,
} from "class-validator";

export class CreateCorporateMembershipDto {
    @ApiProperty({ example: "Acme Impact Ltd" })
    @IsString()
    companyName: string;

    @ApiProperty({ example: "csr@acme.example" })
    @IsEmail()
    contactEmail: string;

    @ApiPropertyOptional({ enum: MembershipTier, default: MembershipTier.STARTER })
    @IsOptional()
    @IsEnum(MembershipTier)
    tier?: MembershipTier;

    @ApiPropertyOptional({ description: "Linked platform user id for CSR contact" })
    @IsOptional()
    @IsString()
    contactPersonId?: string;
}

export class UpdateCorporateMembershipDto extends PartialType(CreateCorporateMembershipDto) {
    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    endDate?: string;
}

export class UpdateCorporateEsgReportDto {
    @ApiPropertyOptional({
        description: "UN SDG goal numbers (1–17)",
        example: [4, 8, 13],
        type: [Number],
    })
    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @Min(1, { each: true })
    @Max(17, { each: true })
    sdgAlignmentGoals?: number[];

    @ApiPropertyOptional({ description: "Narrative SDG impact summary for CSR dashboard" })
    @IsOptional()
    @IsString()
    sdgImpactSummary?: string;

    @ApiPropertyOptional({ example: "FY2026 Q2" })
    @IsOptional()
    @IsString()
    esgReportPeriod?: string;

    @ApiPropertyOptional({ example: "https://acme.example/sustainability-report-2026.pdf" })
    @IsOptional()
    @IsUrl()
    esgReportUrl?: string;

    @ApiPropertyOptional({ example: 1250.5 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    reportedVolunteerHours?: number;

    @ApiPropertyOptional({ example: 50000 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    reportedCommunityInvestment?: number;

    @ApiPropertyOptional({ example: 12.5 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    reportedCarbonOffsetTonnes?: number;
}
