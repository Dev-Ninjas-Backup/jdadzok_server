import { Injectable } from "@nestjs/common";
import { BotChallengeProviderName, MEMORY_BOT_PASS_TOKEN } from "../bot-challenge.constants";
import { BotChallengeProvider } from "./bot-challenge-provider.interface";

/** Deterministic local stand-in for CI / demos (not a real vendor). */
@Injectable()
export class MemoryBotChallengeProvider implements BotChallengeProvider {
    readonly name = BotChallengeProviderName.MEMORY;

    async verify(token: string): Promise<boolean> {
        return token === MEMORY_BOT_PASS_TOKEN;
    }
}
