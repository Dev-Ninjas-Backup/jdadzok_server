import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class NotificationToggleDto {
    @ApiPropertyOptional({
        description: "Receive email notifications",
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    email?: boolean = false;

    @ApiPropertyOptional({
        description: "Receive communication notifications",
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    communication?: boolean = true;

    @ApiPropertyOptional({
        description: "Receive community",
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    community?: boolean = true;

    @ApiPropertyOptional({
        description: "Receive tasks and projects notifications",
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    comment?: boolean = true;

    @ApiPropertyOptional({
        description: "Receive post notifications",
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    post?: boolean = true;

    @ApiPropertyOptional({
        description: "Receive message notifications",
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    message?: boolean = true;

    @ApiPropertyOptional({
        description: "Receive user registration notifications",
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    userRegistration?: boolean = true;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    ngo?: boolean = true;

    @ApiPropertyOptional({ default: true })
    @IsOptional()
    @IsBoolean()
    Custom?: boolean = true;
}
