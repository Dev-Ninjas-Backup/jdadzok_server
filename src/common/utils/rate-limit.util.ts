export const RATE_LIMIT_NAMES = ["POST", "COMMENT", "ENDORSEMENT", "HOUR_LOG"] as const;
export type RateLimitName = (typeof RATE_LIMIT_NAMES)[number];

export interface RateLimitRule {
    max: number;
    windowMs: number;
}

const HOUR_SECONDS = 60 * 60;
const DAY_SECONDS = 24 * HOUR_SECONDS;

/** Placeholders until the client sends final figures; each is overridable by env. */
export const RATE_LIMIT_DEFAULTS: Record<RateLimitName, { max: number; windowSeconds: number }> = {
    POST: { max: 20, windowSeconds: HOUR_SECONDS },
    COMMENT: { max: 60, windowSeconds: HOUR_SECONDS },
    ENDORSEMENT: { max: 10, windowSeconds: DAY_SECONDS },
    HOUR_LOG: { max: 20, windowSeconds: DAY_SECONDS },
};

export const RATE_LIMIT_LABELS: Record<RateLimitName, string> = {
    POST: "post",
    COMMENT: "comment",
    ENDORSEMENT: "endorsement",
    HOUR_LOG: "volunteer hour",
};

function readPositiveInteger(
    get: (key: string) => string | undefined,
    key: string,
    fallback: number,
): number {
    const raw = get(key);
    if (raw === undefined || raw === null || raw.trim() === "") return fallback;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(`${key} must be a positive whole number`);
    }
    return parsed;
}

/** Reads RATE_LIMIT_<NAME>_MAX and RATE_LIMIT_<NAME>_WINDOW_SECONDS; throws on invalid values. */
export function resolveRateLimitRule(
    name: RateLimitName,
    get: (key: string) => string | undefined,
): RateLimitRule {
    const defaults = RATE_LIMIT_DEFAULTS[name];
    return {
        max: readPositiveInteger(get, `RATE_LIMIT_${name}_MAX`, defaults.max),
        windowMs:
            readPositiveInteger(get, `RATE_LIMIT_${name}_WINDOW_SECONDS`, defaults.windowSeconds) *
            1000,
    };
}

/** Seconds until the current fixed window ends (the same windowing RedisService.checkRateLimit uses). */
export function retryAfterSeconds(now: number, windowMs: number): number {
    return Math.max(1, Math.ceil((windowMs - (now % windowMs)) / 1000));
}
