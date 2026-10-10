import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { BotChallengeProviderName } from "../bot-challenge.constants";
import { BotChallengeProvider } from "./bot-challenge-provider.interface";

interface TurnstileResponse {
    success?: boolean;
}

/**
 * Cloudflare Turnstile server-side verification plug-in.
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
@Injectable()
export class TurnstileBotChallengeProvider implements BotChallengeProvider {
    readonly name = BotChallengeProviderName.TURNSTILE;

    constructor(private readonly config: ConfigService) {}

    async verify(token: string): Promise<boolean> {
        const url =
            this.config.get<string>("TURNSTILE_VERIFY_URL") ||
            "https://challenges.cloudflare.com/turnstile/v0/siteverify";

        const body = new URLSearchParams({
            secret: this.config.get<string>("TURNSTILE_SECRET_KEY") ?? "",
            response: token,
        });

        const { data } = await axios.post<TurnstileResponse>(url, body, { timeout: 8_000 });
        return data.success === true;
    }
}
