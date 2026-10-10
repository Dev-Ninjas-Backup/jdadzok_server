import { Logger, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MODERATION_PROVIDER_TOKEN, ModerationProviderName } from "../moderation.constants";
import { MemoryModerationProvider } from "./memory.provider";
import { ModerationProvider } from "./moderation-provider.interface";
import { OffModerationProvider } from "./off.provider";
import { OpenAiModerationProvider } from "./openai.provider";

function parseProviderName(raw: string): ModerationProviderName {
    switch (raw) {
        case "openai":
            return ModerationProviderName.OPENAI;
        case "memory":
            return ModerationProviderName.MEMORY;
        default:
            return ModerationProviderName.OFF;
    }
}

export function createModerationProvider(config: ConfigService): ModerationProvider {
    const logger = new Logger("ModerationProviderFactory");
    const raw = (config.get<string>("ABUSE_CONTENT_PROVIDER") || "off").trim().toLowerCase();
    const name = parseProviderName(raw);

    if (raw !== "off" && name === ModerationProviderName.OFF) {
        logger.warn(`Unknown ABUSE_CONTENT_PROVIDER="${raw}", using off`);
    }

    switch (name) {
        case ModerationProviderName.OPENAI:
            if (!config.get<string>("OPENAI_API_KEY")) {
                logger.warn("ABUSE_CONTENT_PROVIDER=openai but OPENAI_API_KEY missing, using off");
                return new OffModerationProvider();
            }
            return new OpenAiModerationProvider(config);
        case ModerationProviderName.MEMORY:
            return new MemoryModerationProvider();
        default:
            return new OffModerationProvider();
    }
}

export const moderationProviderFactory: Provider = {
    provide: MODERATION_PROVIDER_TOKEN,
    inject: [ConfigService],
    useFactory: createModerationProvider,
};
