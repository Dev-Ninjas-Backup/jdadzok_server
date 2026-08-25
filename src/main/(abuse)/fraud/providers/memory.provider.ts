import { Injectable } from "@nestjs/common";
import { FraudProviderName } from "../fraud.constants";
import { FraudScoreRequest, FraudVendorScore } from "../fraud.types";
import { FraudProvider } from "./fraud-provider.interface";

/**
 * Deterministic local stand-in for CI / demos (not custom ML).
 * Triggers high risk for obvious test markers in email or large payouts.
 */
@Injectable()
export class MemoryFraudProvider implements FraudProvider {
    readonly name = FraudProviderName.MEMORY;

    async score(request: FraudScoreRequest): Promise<FraudVendorScore> {
        const email = request.email.toLowerCase();
        const labels: string[] = [];

        let score = 5;

        if (
            email.includes("fraud") ||
            email.includes("abuse") ||
            email.includes("disposable-test")
        ) {
            score = 95;
            labels.push("memory_high_risk_email");
        } else if (email.includes("risky") || email.endsWith(".ru.test")) {
            score = 70;
            labels.push("memory_queue_email");
        } else if (email.includes("+bot@") || email.startsWith("bot.")) {
            score = 45;
            labels.push("memory_challenge_email");
        }

        if ((request.amountCents ?? 0) >= 500_000) {
            score = Math.max(score, 75);
            labels.push("memory_large_payout");
        }

        if (labels.length === 0) labels.push("memory_low_risk");

        return {
            score,
            labels,
            vendorRef: `memory:${request.userId}:${request.eventType}`,
            rawReason: labels.join(","),
        };
    }
}
