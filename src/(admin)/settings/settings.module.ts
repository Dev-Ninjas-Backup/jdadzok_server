import { Module } from "@nestjs/common";
import { SettingsService } from "./settings.service";
import { SettingsController } from "./settings.controller";
import { SettingRepository } from "./settings.repository";

@Module({
    controllers: [SettingsController],
    providers: [SettingsService, SettingRepository],
})
export class SettingsModule {}
