import { Module, OnModuleInit, Logger, Inject, Optional } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@lib/prisma/prisma.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { SearchSyncService } from "./search-sync.service";
import { searchProviderFactory } from "./providers/search-provider.factory";
import { SEARCH_PROVIDER_TOKEN, SearchProviderName } from "./search.constants";
import { SearchProvider } from "./providers/search-provider.interface";

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [SearchController],
    providers: [searchProviderFactory, SearchSyncService, SearchService],
    exports: [SearchSyncService, SearchService, SEARCH_PROVIDER_TOKEN],
})
export class SearchModule implements OnModuleInit {
    private readonly logger = new Logger(SearchModule.name);

    constructor(
        @Inject(SEARCH_PROVIDER_TOKEN) private readonly provider: SearchProvider,
        @Optional() private readonly sync?: SearchSyncService,
    ) {}

    async onModuleInit() {
        this.logger.log(`Search provider: ${this.provider.name}`);
        if (this.provider.name === SearchProviderName.OFF) return;
        try {
            await this.provider.ensureSchema();
        } catch (err) {
            this.logger.warn(
                `Search schema ensure failed (vendor may be unreachable): ${String(err)}`,
            );
        }
    }
}
