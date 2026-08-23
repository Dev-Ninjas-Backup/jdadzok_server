import { Module } from "@nestjs/common";
import { CapLevelModule } from "./cap-level/cap-leve.module";
import { CorporateModule } from "./corporate/corporate.module";

@Module({
    imports: [CapLevelModule, CorporateModule],
    controllers: [],
    providers: [],
    exports: [CorporateModule],
})
export class CoreGroupModule {}
