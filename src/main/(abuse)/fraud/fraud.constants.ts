export const FRAUD_PROVIDER_TOKEN = Symbol("FRAUD_PROVIDER");

export enum FraudProviderName {
    OFF = "off",
    SIFT = "sift",
    SEON = "seon",
    CASTLE = "castle",
    /** Local / CI only — deterministic stand-in (no external SaaS). */
    MEMORY = "memory",
}

/** Default normalized score thresholds (0–100). Overridable via env. */
export const DEFAULT_FRAUD_QUEUE_SCORE = 60;
export const DEFAULT_FRAUD_REJECT_SCORE = 85;
