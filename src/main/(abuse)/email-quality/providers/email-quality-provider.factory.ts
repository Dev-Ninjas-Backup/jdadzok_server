import { Logger, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EMAIL_QUALITY_PROVIDER_TOKEN, EmailQualityProviderName } from "../email-quality.constants";
import { AbstractEmailQualityProvider } from "./abstract.provider";
import { EmailQualityProvider } from "./email-quality-provider.interface";
import { KickboxEmailQualityProvider } from "./kickbox.provider";
import { MemoryEmailQualityProvider } from "./memory.provider";
import { OffEmailQualityProvider } from "./off.provider";

function parseProviderName(raw: string): EmailQualityProviderName {
    switch (raw) {
        case "abstract":
            return EmailQualityProviderName.ABSTRACT;
        case "kickbox":
            return EmailQualityProviderName.KICKBOX;
        case "memory":
            return EmailQualityProviderName.MEMORY;
        default:
            return EmailQualityProviderName.OFF;
    }
}

export function createEmailQualityProvider(config: ConfigService): EmailQualityProvider {
    const logger = new Logger("EmailQualityProviderFactory");
    const raw = (config.get<string>("ABUSE_EMAIL_PROVIDER") || "off").trim().toLowerCase();
    const name = parseProviderName(raw);

    if (raw !== "off" && name === EmailQualityProviderName.OFF) {
        logger.warn(`Unknown ABUSE_EMAIL_PROVIDER="${raw}", using off`);
    }

    switch (name) {
        case EmailQualityProviderName.ABSTRACT:
            if (!config.get<string>("ABSTRACT_EMAIL_API_KEY")) {
                logger.warn(
                    "ABUSE_EMAIL_PROVIDER=abstract but ABSTRACT_EMAIL_API_KEY missing, using off",
                );
                return new OffEmailQualityProvider();
            }
            return new AbstractEmailQualityProvider(config);
        case EmailQualityProviderName.KICKBOX:
            if (!config.get<string>("KICKBOX_API_KEY")) {
                logger.warn("ABUSE_EMAIL_PROVIDER=kickbox but KICKBOX_API_KEY missing, using off");
                return new OffEmailQualityProvider();
            }
            return new KickboxEmailQualityProvider(config);
        case EmailQualityProviderName.MEMORY:
            return new MemoryEmailQualityProvider();
        default:
            return new OffEmailQualityProvider();
    }
}

export const emailQualityProviderFactory: Provider = {
    provide: EMAIL_QUALITY_PROVIDER_TOKEN,
    inject: [ConfigService],
    useFactory: createEmailQualityProvider,
};
