import {
    ApiHideProperty,
    ApiProperty,
    ApiPropertyOptional,
    IntersectionType,
    PartialType,
} from "@nestjs/swagger";
import { AuthProvider, CapLevel, Role } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    MinLength,
    ValidateNested,
} from "class-validator";
import { UpdateUserProfileDto } from "../../user-profile/dto/user.profile.dto";

class UserDto {
    @ApiProperty({
        description: "User email address",
        example: "devlopersabbir@gmail.com",
    })
    @IsEmail()
    email?: string;

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

    @ApiPropertyOptional({
        type: UpdateUserProfileDto,
    })
    @IsOptional()
    @ValidateNested()
    @Transform(({ value }) => {
        if (!value || value === "null" || value === "undefined") return undefined;
        try {
            return typeof value === "string" ? JSON.parse(value) : value;
        } catch {
            return undefined;
        }
    })
    @Type(() => UpdateUserProfileDto)
    profile?: UpdateUserProfileDto;
}
export class UpdateUserDto extends IntersectionType(PartialType(UserDto)) {}
