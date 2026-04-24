import { Controller, Get, Post, Body } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { CreateAdminActivity } from "./dto/createadminActivity.dto";

@Controller("settings")
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) {}

    @Post()
    async create(@Body() createSettingDto: CreateAdminActivity) {
        try {
            const res = await this.settingsService.createActivityScore(createSettingDto);
            return res;
        } catch (error) {
            return error;
        }
    }

    @Get()
    findAll() {
        return this.settingsService.findTheActivityScoretable();
    }
}
