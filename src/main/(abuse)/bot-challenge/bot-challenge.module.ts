import { Inject, Logger, Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BOT_CHALLENGE_PROVIDER_TOKEN, BotChallengeProviderName } from "./bot-challenge.constants";
import { BotChallengeService } from "./bot-challenge.service";
import { botChallengeProviderFactory } from "./providers/bot-challenge-provider.factory";
import { BotChallengeProvider } from "./providers/bot-challenge-provider.interface";

@Module({
    imports: [ConfigModule],
    providers: [botChallengeProviderFactory, BotChallengeService],
    exports: [BotChallengeService],
})
export class BotChallengeModule implements OnModuleInit {
    private readonly logger = new Logger(BotChallengeModule.name);

    constructor(
        @Inject(BOT_CHALLENGE_PROVIDER_TOKEN) private readonly provider: BotChallengeProvider,
    ) {}

    onModuleInit() {
        this.logger.log(`Bot challenge provider: ${this.provider.name}`);
        if (this.provider.name === BotChallengeProviderName.OFF) {
            this.logger.log("Bot challenge disabled (ABUSE_BOT_PROVIDER=off)");
        }
    }
}
