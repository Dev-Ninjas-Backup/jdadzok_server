import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { VerifiedUser } from "@type/index";
import { CreateUserProfileMetricsDto } from "./dto/user.profile.metrics";
import { UserProfileMetricsService } from "./user.profile.metrics.service";

@ApiBearerAuth()
@Controller("user-profile-metrics")
export class UserProfileMetricsController {
    constructor(private readonly profileService: UserProfileMetricsService) {}
    @Post()
    async createMetrics(
        @GetVerifiedUser() user: VerifiedUser,
        @Body() body: CreateUserProfileMetricsDto,
    ) {
        try {
            const profile = await this.profileService.create(user.id, body);
            return successResponse(profile, "Profile update successfully");
        } catch (err) {
            return err;
        }
    }
}
