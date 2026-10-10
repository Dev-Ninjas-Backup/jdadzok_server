import { Logger, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BOT_CHALLENGE_PROVIDER_TOKEN, BotChallengeProviderName } from "../bot-challenge.constants";
import { BotChallengeProvider } from "./bot-challenge-provider.interface";
import { MemoryBotChallengeProvider } from "./memory.provider";
import { OffBotChallengeProvider } from "./off.provider";
import { TurnstileBotChallengeProvider } from "./turnstile.provider";

function parseProviderName(raw: string): BotChallengeProviderName {
    switch (raw) {
        case "turnstile":
            return BotChallengeProviderName.TURNSTILE;
        case "memory":
            return BotChallengeProviderName.MEMORY;
        default:
            return BotChallengeProviderName.OFF;
    }
}

export function createBotChallengeProvider(config: ConfigService): BotChallengeProvider {
    const logger = new Logger("BotChallengeProviderFactory");
    const raw = (config.get<string>("ABUSE_BOT_PROVIDER") || "off").trim().toLowerCase();
    const name = parseProviderName(raw);

    if (raw !== "off" && name === BotChallengeProviderName.OFF) {
        logger.warn(`Unknown ABUSE_BOT_PROVIDER="${raw}", using off`);
    }

    switch (name) {
        case BotChallengeProviderName.TURNSTILE:
            if (!config.get<string>("TURNSTILE_SECRET_KEY")) {
                logger.warn(
                    "ABUSE_BOT_PROVIDER=turnstile but TURNSTILE_SECRET_KEY missing, using off",
                );
                return new OffBotChallengeProvider();
            }
            return new TurnstileBotChallengeProvider(config);
        case BotChallengeProviderName.MEMORY:
            return new MemoryBotChallengeProvider();
        default:
            return new OffBotChallengeProvider();
    }
}

export const botChallengeProviderFactory: Provider = {
    provide: BOT_CHALLENGE_PROVIDER_TOKEN,
    inject: [ConfigService],
    useFactory: createBotChallengeProvider,
};
