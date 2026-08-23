import { Module } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { ContributionLeaderboardController } from "./contribution-leaderboard.controller";
import { ContributionLeaderboardService } from "./contribution-leaderboard.service";

@Module({
    controllers: [ContributionLeaderboardController],
    providers: [ContributionLeaderboardService, PrismaService],
    exports: [ContributionLeaderboardService],
})
export class LeaderboardModule {}
