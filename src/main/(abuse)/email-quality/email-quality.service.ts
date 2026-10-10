import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EMAIL_QUALITY_PROVIDER_TOKEN, EmailQualityProviderName } from "./email-quality.constants";
import { EmailQualityProvider } from "./providers/email-quality-provider.interface";

@Injectable()
export class EmailQualityService {
    private readonly logger = new Logger(EmailQualityService.name);

    constructor(
        @Inject(EMAIL_QUALITY_PROVIDER_TOKEN) private readonly provider: EmailQualityProvider,
        private readonly config: ConfigService,
    ) {}

    status() {
        return {
            enabled: this.provider.name !== EmailQualityProviderName.OFF,
            provider: this.provider.name,
            failClosed: this.failClosed(),
        };
    }

    /**
     * Rejects disposable / undeliverable addresses. No-op when the provider is off.
     * Vendor failures fail open unless ABUSE_EMAIL_FAIL_CLOSED=true.
     */
    async assertEmailAllowed(email: string): Promise<void> {
        if (this.provider.name === EmailQualityProviderName.OFF) return;

        try {
            const verdict = await this.provider.check(email);
            if (verdict.disposable || !verdict.deliverable) {
                throw new BadRequestException("Please use a valid, non-disposable email address");
            }
        } catch (err) {
            if (err instanceof BadRequestException) throw err;

            const reason = err instanceof Error ? err.message : "unknown error";
            this.logger.warn(`Email vendor ${this.provider.name} failed: ${reason}`);
            if (this.failClosed()) {
                throw new ServiceUnavailableException("Unable to verify email right now");
            }
        }
    }

    private failClosed(): boolean {
        return (
            (this.config.get<string>("ABUSE_EMAIL_FAIL_CLOSED") || "false").trim().toLowerCase() ===
            "true"
        );
    }
}
