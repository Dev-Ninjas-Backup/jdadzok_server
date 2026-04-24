import {
    ApiHideProperty,
    ApiProperty,
    ApiPropertyOptional,
    IntersectionType,
    PartialType,
} from "@nestjs/swagger";
import { AuthProvider, CapLevel, Role } from "@prisma/client";
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { UpdateUserProfileMetricsDto } from "../../profile-metrics/dto/user.profile.metrics";
import { UpdateUserProfileDto } from "../../user-profile/dto/user.profile.dto";

class UserCreate {
    @ApiProperty({ description: "name of the user", example: "John Mollik" })
    @IsString()
    name?: string;

    @ApiProperty({
        description: "User email address",
        example: "devlopersabbir@gmail.com",
    })
    @IsEmail()
    email: string;

    @ApiPropertyOptional({ description: "Password hash", example: "pass123" })
    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;

    @ApiPropertyOptional({
        enum: AuthProvider,
        description: "Authentication provider",
        example: AuthProvider.EMAIL,
    })
    @IsOptional()
    @IsEnum(AuthProvider)
    authProvider?: AuthProvider;

    @ApiHideProperty()
    @IsBoolean()
    @IsOptional()
    isVerified?: boolean;

    @ApiHideProperty()
    @IsOptional()
    @IsEnum(Role)
    role?: Role;

    @ApiHideProperty()
    @IsOptional()
    @IsEnum(CapLevel)
    capLevel?: CapLevel;
}

class SelectUser {
    @ApiPropertyOptional({
        type: UpdateUserProfileDto,
    })
    profile?: UpdateUserProfileDto;

    @ApiPropertyOptional({
        type: UpdateUserProfileMetricsDto,
    })
    metrics?: UpdateUserProfileMetricsDto;
}

export class CreateUserDto extends IntersectionType(UserCreate) {}
export class SelectUserDto extends IntersectionType(
    PartialType(CreateUserDto),
    PartialType(SelectUser),
) {}
