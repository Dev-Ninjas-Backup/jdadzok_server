import { ModerationDecision } from "@prisma/client";

export interface ModerationVendorScore {
    /** Normalized 0–100 (higher = riskier). */
    score: number;
    /** Non-PII category labels, e.g. "harassment". */
    labels: string[];
    vendorRef?: string;
}

export interface ModerationOutcome {
    decision: ModerationDecision;
    score: number;
    labels: string[];
    checkId?: string;
}

export function mapModerationScore(
    score: number,
    queueThreshold: number,
    rejectThreshold: number,
): ModerationDecision {
    if (score >= rejectThreshold) return ModerationDecision.REJECT;
    if (score >= queueThreshold) return ModerationDecision.QUEUE;
    return ModerationDecision.ALLOW;
}
