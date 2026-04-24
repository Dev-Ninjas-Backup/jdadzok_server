import { ApiPropertyOptional, IntersectionType, PartialType } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

class UserProfileMetrics {
    @ApiPropertyOptional({ description: "Number of followers", example: 120 })
    @IsOptional()
    @IsInt()
    @Min(0)
    followersCount?: number;

    @ApiPropertyOptional({
        description: "Number of people the user is following",
        example: 80,
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    followingCount?: number;
}
export class CreateUserProfileMetricsDto extends IntersectionType(UserProfileMetrics) {}
export class UpdateUserProfileMetricsDto extends PartialType(
    IntersectionType(UserProfileMetrics),
) {}
