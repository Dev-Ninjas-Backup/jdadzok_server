import { FraudDecision, FraudEventType } from "@prisma/client";
import { FraudProviderName } from "./fraud.constants";

export interface FraudScoreRequest {
    userId: string;
    email: string;
    eventType: FraudEventType;
    /** Client IP when available (device / velocity signals). */
    ip?: string;
    /** Optional amount in minor units (payout / payment). */
    amountCents?: number;
    currency?: string;
    /** Opaque session / request id for vendor correlation. */
    requestId?: string;
}

export interface FraudVendorScore {
    /** Normalized 0–100 (higher = riskier). */
    score: number;
    labels: string[];
    vendorRef?: string;
    rawReason?: string;
}

export interface FraudEvaluationResult {
    provider: FraudProviderName;
    enabled: boolean;
    score: number;
    decision: FraudDecision;
    labels: string[];
    vendorRef?: string;
    checkId?: string;
    reason?: string;
}

export function mapScoreToDecision(
    score: number,
    queueThreshold: number,
    rejectThreshold: number,
): FraudDecision {
    if (score >= rejectThreshold) return FraudDecision.REJECT;
    if (score >= queueThreshold) return FraudDecision.QUEUE;
    if (score >= queueThreshold * 0.5) return FraudDecision.CHALLENGE;
    return FraudDecision.ALLOW;
}
