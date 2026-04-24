import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";
import { Role } from "@prisma/client"; // or wherever your enum is imported from

export class GetUsersQueryDto {
    @ApiPropertyOptional({ description: "Search term for filtering users", example: "john" })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: "Filter by user status", enum: ["active", "suspended"] })
    @IsOptional()
    @IsEnum(["active", "suspended"])
    status?: "active" | "suspended";

    @ApiPropertyOptional({ description: "Filter by role", enum: Role })
    @IsOptional()
    @IsEnum(Role)
    role?: Role;

    @ApiPropertyOptional({ description: "Page number for pagination", default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ description: "Number of users per page", default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;
}
