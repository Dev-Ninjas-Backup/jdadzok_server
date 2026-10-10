import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BOT_CHALLENGE_PROVIDER_TOKEN, BotChallengeProviderName } from "./bot-challenge.constants";
import { BotChallengeProvider } from "./providers/bot-challenge-provider.interface";

@Injectable()
export class BotChallengeService {
    private readonly logger = new Logger(BotChallengeService.name);

    constructor(
        @Inject(BOT_CHALLENGE_PROVIDER_TOKEN) private readonly provider: BotChallengeProvider,
        private readonly config: ConfigService,
    ) {}

    status() {
        return {
            enabled: this.provider.name !== BotChallengeProviderName.OFF,
            provider: this.provider.name,
            failClosed: this.failClosed(),
        };
    }

    /**
     * Requires a valid challenge token. No-op when the provider is off.
     * Vendor failures fail open unless ABUSE_BOT_FAIL_CLOSED=true.
     */
    async assertHuman(token?: string): Promise<void> {
        if (this.provider.name === BotChallengeProviderName.OFF) return;

        if (!token) throw new BadRequestException("Bot challenge token is required");

        try {
            const ok = await this.provider.verify(token);
            if (!ok) throw new BadRequestException("Bot challenge failed");
        } catch (err) {
            if (err instanceof BadRequestException) throw err;

            const reason = err instanceof Error ? err.message : "unknown error";
            this.logger.warn(`Bot vendor ${this.provider.name} failed: ${reason}`);
            if (this.failClosed()) {
                throw new ServiceUnavailableException("Unable to verify challenge right now");
            }
        }
    }

    private failClosed(): boolean {
        return (
            (this.config.get<string>("ABUSE_BOT_FAIL_CLOSED") || "false").trim().toLowerCase() ===
            "true"
        );
    }
}
