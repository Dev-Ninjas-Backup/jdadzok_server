import { ValidateSuperAdmin } from "@common/jwt/jwt.decorator";
import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MaintenanceSettingsDto } from "../dto/maintenance.dto";
import { PlatformInformationDto } from "../dto/platform-information.dto"; // ⬅️ Correct DTO
import { AdminSettingsService } from "../service/admin.settings.service";
import { handleRequest } from "@common/utils/handle.request.util";

import { UpdateCapLevelQueryDto } from "../dto/updateCapLevelQuery.dto";

@ApiTags("Dashboard Admin Settings")
@Controller("settings-admin")
export class AdminSettingsController {
    constructor(private readonly adminSettingsService: AdminSettingsService) {}

    // ------------------- Admin Settings general platform settings -------------------
    @ApiBearerAuth()
    @ValidateSuperAdmin()
    @Post("platform")
    async updatePlatformInfo(@Body() body: PlatformInformationDto) {
        return this.adminSettingsService.updatePlatformInfo(body);
    }
    // --------- Admin Settings general platform settings -------------------
    @ApiBearerAuth()
    @ValidateSuperAdmin()
    @Post("maintenance")
    @ApiBearerAuth()
    @ValidateSuperAdmin()
    async updateMaintenanceSettings(@Body() body: MaintenanceSettingsDto) {
        return this.adminSettingsService.updateMaintenanceSettings(body);
    }

    // ----------------get maintenance settings------------------
    @ApiBearerAuth()
    @ValidateSuperAdmin()
    @Get("maintenance")
    async getMaintenanceSettings() {
        return this.adminSettingsService.getMaintenanceSettings();
    }
    // ----------------get platform settings------------------
    @ApiBearerAuth()
    @ValidateSuperAdmin()
    @Get("platform")
    async getPlatformSettings() {
        return this.adminSettingsService.getPlatformSettings();
    }
    // -------------------------- cap level user remote promote --------------------------
    @ApiBearerAuth()
    @ValidateSuperAdmin()
    @ApiOperation({ summary: "Promote User cap level remote promote cap level user" })
    @Patch("updateCaplevel/:userId")
    async updateCaplevel(@Param("userId") userId: string, @Body() dto: UpdateCapLevelQueryDto) {
        return handleRequest(
            () => this.adminSettingsService.updateCaplevel(userId, dto),
            "User Promote successfully",
        );
    }
}
