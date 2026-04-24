import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class PlatformInformationDto {
    @ApiProperty({ example: "MyPlatform", required: false })
    @IsOptional()
    @IsString()
    platformName?: string;

    @ApiProperty({ example: "support@myplatform.com", required: false })
    @IsOptional()
    @IsString()
    supportEmail?: string;

    @ApiProperty({ example: "https://myplatform.com", required: false })
    @IsOptional()
    @IsString()
    platformUrl?: string;
}
