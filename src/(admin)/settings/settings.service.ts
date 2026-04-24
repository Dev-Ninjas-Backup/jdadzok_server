import { Injectable } from "@nestjs/common";
import { SettingRepository } from "./settings.repository";
import { CreateAdminActivity } from "./dto/createadminActivity.dto";

@Injectable()
export class SettingsService {
    constructor(private readonly settingRepo: SettingRepository) {}
    async createActivityScore(createSettingDto: CreateAdminActivity) {
        const res = await this.settingRepo.postCaplevelData(createSettingDto);
        return res;
    }

    async findTheActivityScoretable() {
        const res = await this.settingRepo.getCapLevelData();
        return res;
    }
}
