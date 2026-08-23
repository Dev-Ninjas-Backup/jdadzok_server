import { GetUser, GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { TUser, VerifiedUser } from "@type/index";
import { CreateUserProfileDto } from "./dto/user.profile.dto";
import { VolunteerMentorOptInDto } from "./dto/volunteer-mentor-opt-in.dto";
import { CapArtPreferencesDto } from "./dto/cap-art-preferences.dto";
import { UserProfileService } from "./user.profile.service";

@ApiBearerAuth()
@Controller("user-profile")
export class UserProfileController {
    constructor(private readonly profileService: UserProfileService) {}

    @Get()
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    async getProfile(@GetUser() user: TUser) {
        try {
            const profile = await this.profileService.get(user.userId);
            return successResponse(profile, "Profile retrive successfully");
        } catch (err) {
            return err;
        }
    }

    @Patch("")
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    async updateProfile(@GetVerifiedUser() user: VerifiedUser, @Body() data: CreateUserProfileDto) {
        try {
            const profile = await this.profileService.updateUserProfile(user.id, data);
            return successResponse(profile, "Profile update successfully");
        } catch (err) {
            return err;
        }
    }

    @ApiOperation({
        summary: "Toggle volunteer / mentor opt-in",
        description:
            "Enable or disable mentoring tools and verified-hour logging. Independent of Cap level.",
    })
    @Patch("volunteer-mentor-opt-in")
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    async setVolunteerMentorOptIn(
        @GetVerifiedUser() user: VerifiedUser,
        @Body() dto: VolunteerMentorOptInDto,
    ) {
        try {
            const profile = await this.profileService.setVolunteerMentorOptIn(
                user.id,
                dto.isVolunteerMentorOptIn,
            );
            return successResponse(profile, "Volunteer / mentor opt-in updated successfully");
        } catch (err) {
            return err;
        }
    }

    @ApiOperation({
        summary: "Update illustrated cap art style and placement",
        description:
            "Profile display preferences for Cap art: style (structured / soft) and placement (worn / beside). Default placement is beside.",
    })
    @Get("cap-art-preferences")
    @UseGuards(JwtAuthGuard)
    async getCapArtPreferences(@GetVerifiedUser() user: VerifiedUser) {
        try {
            const prefs = await this.profileService.getCapArtPreferences(user.id);
            return successResponse(prefs, "Cap art preferences retrieved successfully");
        } catch (err) {
            return err;
        }
    }

    @Patch("cap-art-preferences")
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    async setCapArtPreferences(
        @GetVerifiedUser() user: VerifiedUser,
        @Body() dto: CapArtPreferencesDto,
    ) {
        try {
            const profile = await this.profileService.setCapArtPreferences(user.id, dto);
            return successResponse(profile, "Cap art preferences updated successfully");
        } catch (err) {
            return err;
        }
    }

    @UseGuards(JwtAuthGuard)
    @Get(":id")
    async getUserProfile(@GetVerifiedUser() user: VerifiedUser, @Param("id") id: string) {
        try {
            const profile = await this.profileService.getUserProfile(user.id, id);
            return successResponse(profile, "Get Profile successfully");
        } catch (err) {
            return err;
        }
    }
}
