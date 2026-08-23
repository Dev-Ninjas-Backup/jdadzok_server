import { Module } from "@nestjs/common";
import { CapLevelModule } from "./cap-level/cap-leve.module";
import { ContractsModule } from "./contracts/contracts.module";
import { CorporateModule } from "./corporate/corporate.module";
import { ImpactModule } from "./impact/impact.module";
import { LeaderboardModule } from "./leaderboard/leaderboard.module";

@Module({
    imports: [CapLevelModule, ContractsModule, CorporateModule, ImpactModule, LeaderboardModule],
    controllers: [],
    providers: [],
    exports: [CorporateModule, ImpactModule, LeaderboardModule],
})
export class CoreGroupModule {}
