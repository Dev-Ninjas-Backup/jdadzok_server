import { Injectable } from "@nestjs/common";
import { ModerationProviderName } from "../moderation.constants";
import { ModerationVendorScore } from "../moderation.types";
import { ModerationProvider } from "./moderation-provider.interface";

/** No-op when ABUSE_CONTENT_PROVIDER=off or misconfigured: always low risk. */
@Injectable()
export class OffModerationProvider implements ModerationProvider {
    readonly name = ModerationProviderName.OFF;

    async moderate(text: string): Promise<ModerationVendorScore> {
        void text;
        return { score: 0, labels: ["provider_off"] };
    }
}
