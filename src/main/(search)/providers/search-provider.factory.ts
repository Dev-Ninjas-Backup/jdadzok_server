import { Logger, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SEARCH_PROVIDER_TOKEN, SearchProviderName } from "../search.constants";
import { OffSearchProvider } from "./off.provider";
import { MemorySearchProvider } from "./memory.provider";
import { TypesenseSearchProvider } from "./typesense.provider";
import { AlgoliaSearchProvider } from "./algolia.provider";
import { SearchProvider } from "./search-provider.interface";

export function createSearchProvider(config: ConfigService): SearchProvider {
    const logger = new Logger("SearchProviderFactory");
    const raw = (config.get<string>("SEARCH_PROVIDER") || SearchProviderName.OFF)
        .trim()
        .toLowerCase();

    switch (raw) {
        case SearchProviderName.TYPESENSE: {
            const host = config.get<string>("TYPESENSE_HOST");
            const key = config.get<string>("TYPESENSE_API_KEY");
            if (!host || !key) {
                logger.warn(
                    "SEARCH_PROVIDER=typesense but TYPESENSE_HOST/API_KEY missing — falling back to off",
                );
                return new OffSearchProvider();
            }
            return new TypesenseSearchProvider(config);
        }
        case SearchProviderName.ALGOLIA: {
            const appId = config.get<string>("ALGOLIA_APP_ID");
            const adminKey = config.get<string>("ALGOLIA_ADMIN_API_KEY");
            if (!appId || !adminKey) {
                logger.warn(
                    "SEARCH_PROVIDER=algolia but ALGOLIA_APP_ID/ADMIN_API_KEY missing — falling back to off",
                );
                return new OffSearchProvider();
            }
            return new AlgoliaSearchProvider(config);
        }
        case SearchProviderName.MEMORY:
            logger.log("Using in-memory search provider (local/CI)");
            return new MemorySearchProvider();
        case SearchProviderName.OFF:
        default:
            if (raw !== SearchProviderName.OFF) {
                logger.warn(`Unknown SEARCH_PROVIDER="${raw}" — using off`);
            }
            return new OffSearchProvider();
    }
}

export const searchProviderFactory: Provider = {
    provide: SEARCH_PROVIDER_TOKEN,
    inject: [ConfigService],
    useFactory: createSearchProvider,
};
