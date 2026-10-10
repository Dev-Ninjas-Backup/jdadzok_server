import { ModerationProviderName } from "../moderation.constants";
import { ModerationVendorScore } from "../moderation.types";

export interface ModerationProvider {
    readonly name: ModerationProviderName;

    /** Score user-written text via the vendor (or stand-in). */
    moderate(text: string): Promise<ModerationVendorScore>;
}
