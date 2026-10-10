import { Inject, Logger, Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@lib/prisma/prisma.module";
import { SearchModule } from "@module/(search)/search.module";
import { MODERATION_PROVIDER_TOKEN, ModerationProviderName } from "./moderation.constants";
import { ModerationController } from "./moderation.controller";
import { ModerationService } from "./moderation.service";
import { moderationProviderFactory } from "./providers/moderation-provider.factory";
import { ModerationProvider } from "./providers/moderation-provider.interface";

@Module({
    imports: [ConfigModule, PrismaModule, SearchModule],
    controllers: [ModerationController],
    providers: [moderationProviderFactory, ModerationService],
    exports: [ModerationService],
})
export class ModerationModule implements OnModuleInit {
    private readonly logger = new Logger(ModerationModule.name);

    constructor(@Inject(MODERATION_PROVIDER_TOKEN) private readonly provider: ModerationProvider) {}

    onModuleInit() {
        this.logger.log(`Content moderation provider: ${this.provider.name}`);
        if (this.provider.name === ModerationProviderName.OFF) {
            this.logger.log("Content moderation disabled (ABUSE_CONTENT_PROVIDER=off)");
        }
    }
}
