import { Injectable } from "@nestjs/common";
import {
    MEMORY_MODERATION_QUEUE_MARKER,
    MEMORY_MODERATION_REJECT_MARKER,
    ModerationProviderName,
} from "../moderation.constants";
import { ModerationVendorScore } from "../moderation.types";
import { ModerationProvider } from "./moderation-provider.interface";

/** Deterministic local stand-in for CI / demos (not a real vendor). */
@Injectable()
export class MemoryModerationProvider implements ModerationProvider {
    readonly name = ModerationProviderName.MEMORY;

    async moderate(text: string): Promise<ModerationVendorScore> {
        if (text.includes(MEMORY_MODERATION_REJECT_MARKER)) {
            return { score: 95, labels: ["memory_high_risk"], vendorRef: "memory" };
        }
        if (text.includes(MEMORY_MODERATION_QUEUE_MARKER)) {
            return { score: 70, labels: ["memory_queue"], vendorRef: "memory" };
        }
        return { score: 5, labels: ["memory_low_risk"], vendorRef: "memory" };
    }
}
