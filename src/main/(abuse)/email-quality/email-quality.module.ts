import { Logger, Module, OnModuleInit, Inject } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EMAIL_QUALITY_PROVIDER_TOKEN, EmailQualityProviderName } from "./email-quality.constants";
import { EmailQualityService } from "./email-quality.service";
import { emailQualityProviderFactory } from "./providers/email-quality-provider.factory";
import { EmailQualityProvider } from "./providers/email-quality-provider.interface";

@Module({
    imports: [ConfigModule],
    providers: [emailQualityProviderFactory, EmailQualityService],
    exports: [EmailQualityService],
})
export class EmailQualityModule implements OnModuleInit {
    private readonly logger = new Logger(EmailQualityModule.name);

    constructor(
        @Inject(EMAIL_QUALITY_PROVIDER_TOKEN) private readonly provider: EmailQualityProvider,
    ) {}

    onModuleInit() {
        this.logger.log(`Email quality provider: ${this.provider.name}`);
        if (this.provider.name === EmailQualityProviderName.OFF) {
            this.logger.log("Email quality checks disabled (ABUSE_EMAIL_PROVIDER=off)");
        }
    }
}
