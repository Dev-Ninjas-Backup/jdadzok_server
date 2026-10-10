export const BOT_CHALLENGE_PROVIDER_TOKEN = Symbol("BOT_CHALLENGE_PROVIDER");

export enum BotChallengeProviderName {
    OFF = "off",
    TURNSTILE = "turnstile",
    /** Local / CI only — deterministic stand-in (no external SaaS). */
    MEMORY = "memory",
}

/** Token the memory provider accepts as "human". */
export const MEMORY_BOT_PASS_TOKEN = "memory-human";
