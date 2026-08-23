import { Module } from "@nestjs/common";
import { CapLevelModule } from "./cap-level/cap-leve.module";
import { CorporateModule } from "./corporate/corporate.module";
import { ImpactModule } from "./impact/impact.module";

@Module({
    imports: [CapLevelModule, CorporateModule, ImpactModule],
    controllers: [],
    providers: [],
    exports: [CorporateModule, ImpactModule],
})
export class CoreGroupModule {}
