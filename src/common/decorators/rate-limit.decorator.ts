import { RateLimitName } from "@common/utils/rate-limit.util";
import { SetMetadata } from "@nestjs/common";

export const RATE_LIMIT_KEY = "rate_limit_rule";

/** Pair with RateLimitGuard, placed after JwtAuthGuard so the limit is per member. */
export const RateLimit = (name: RateLimitName) => SetMetadata(RATE_LIMIT_KEY, name);
