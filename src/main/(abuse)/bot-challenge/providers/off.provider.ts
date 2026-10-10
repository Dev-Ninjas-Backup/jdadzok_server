import { Injectable } from "@nestjs/common";
import { BotChallengeProviderName } from "../bot-challenge.constants";
import { BotChallengeProvider } from "./bot-challenge-provider.interface";

/** No-op when ABUSE_BOT_PROVIDER=off or misconfigured: every request passes. */
@Injectable()
export class OffBotChallengeProvider implements BotChallengeProvider {
    readonly name = BotChallengeProviderName.OFF;

    async verify(token: string): Promise<boolean> {
        void token;
        return true;
    }
}
