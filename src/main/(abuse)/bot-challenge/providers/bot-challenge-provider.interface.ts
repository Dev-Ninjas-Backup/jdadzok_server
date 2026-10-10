import { BotChallengeProviderName } from "../bot-challenge.constants";

export interface BotChallengeProvider {
    readonly name: BotChallengeProviderName;

    /** Verify the client-side challenge token with the vendor. */
    verify(token: string): Promise<boolean>;
}
