import { Module } from "@nestjs/common";
import { OverviewModule } from "./overview/overview.module";

import { PromotionsModule } from "./promotions/promotions.module";
import { SettingsModule } from "./settings/settings.module";

@Module({
    imports: [OverviewModule, PromotionsModule, SettingsModule],
    providers: [],
})
export class AdminModule {}
