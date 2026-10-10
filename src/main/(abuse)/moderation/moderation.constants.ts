export const MODERATION_PROVIDER_TOKEN = Symbol("MODERATION_PROVIDER");

export enum ModerationProviderName {
    OFF = "off",
    OPENAI = "openai",
    /** Local / CI only — deterministic stand-in (no external SaaS). */
    MEMORY = "memory",
}

/** Default normalized score thresholds (0–100). Overridable via env. */
export const DEFAULT_MODERATION_QUEUE_SCORE = 60;
export const DEFAULT_MODERATION_REJECT_SCORE = 85;

/** Markers the memory provider reacts to, so tests and demos need no vendor. */
export const MEMORY_MODERATION_QUEUE_MARKER = "[[mod-queue]]";
export const MEMORY_MODERATION_REJECT_MARKER = "[[mod-reject]]";
