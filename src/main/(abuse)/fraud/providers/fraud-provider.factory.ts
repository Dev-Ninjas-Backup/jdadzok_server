import { Logger, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FRAUD_PROVIDER_TOKEN, FraudProviderName } from "../fraud.constants";
import { FraudProvider } from "./fraud-provider.interface";
import { OffFraudProvider } from "./off.provider";
import { MemoryFraudProvider } from "./memory.provider";
import { SiftFraudProvider } from "./sift.provider";
import { SeonFraudProvider } from "./seon.provider";
import { CastleFraudProvider } from "./castle.provider";

function parseProviderName(raw: string): FraudProviderName {
    switch (raw) {
        case "sift":
            return FraudProviderName.SIFT;
        case "seon":
            return FraudProviderName.SEON;
        case "castle":
            return FraudProviderName.CASTLE;
        case "memory":
            return FraudProviderName.MEMORY;
        case "off":
            return FraudProviderName.OFF;
        default:
            return FraudProviderName.OFF;
    }
}

export function createFraudProvider(config: ConfigService): FraudProvider {
    const logger = new Logger("FraudProviderFactory");
    const raw = (config.get<string>("ABUSE_FRAUD_PROVIDER") || "off").trim().toLowerCase();
    const name = parseProviderName(raw);

    if (raw !== "off" && name === FraudProviderName.OFF) {
        logger.warn(`Unknown ABUSE_FRAUD_PROVIDER="${raw}" — using off`);
    }

    switch (name) {
        case FraudProviderName.SIFT: {
            const key = config.get<string>("SIFT_API_KEY");
            if (!key) {
                logger.warn(
                    "ABUSE_FRAUD_PROVIDER=sift but SIFT_API_KEY missing — falling back to off",
                );
                return new OffFraudProvider();
            }
            return new SiftFraudProvider(config);
        }
        case FraudProviderName.SEON: {
            const key = config.get<string>("SEON_API_KEY");
            if (!key) {
                logger.warn(
                    "ABUSE_FRAUD_PROVIDER=seon but SEON_API_KEY missing — falling back to off",
                );
                return new OffFraudProvider();
            }
            return new SeonFraudProvider(config);
        }
        case FraudProviderName.CASTLE: {
            const secret = config.get<string>("CASTLE_API_SECRET");
            if (!secret) {
                logger.warn(
                    "ABUSE_FRAUD_PROVIDER=castle but CASTLE_API_SECRET missing — falling back to off",
                );
                return new OffFraudProvider();
            }
            return new CastleFraudProvider(config);
        }
        case FraudProviderName.MEMORY:
            logger.log("Using in-memory fraud provider (local/CI)");
            return new MemoryFraudProvider();
        case FraudProviderName.OFF:
        default:
            return new OffFraudProvider();
    }
}

export const fraudProviderFactory: Provider = {
    provide: FRAUD_PROVIDER_TOKEN,
    inject: [ConfigService],
    useFactory: createFraudProvider,
};
