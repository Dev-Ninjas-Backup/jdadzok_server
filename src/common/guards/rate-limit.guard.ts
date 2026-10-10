import { RATE_LIMIT_KEY } from "@common/decorators/rate-limit.decorator";
import { RequestWithUser } from "@common/jwt/jwt.interface";
import {
    RATE_LIMIT_LABELS,
    RATE_LIMIT_NAMES,
    RateLimitName,
    RateLimitRule,
    resolveRateLimitRule,
    retryAfterSeconds,
} from "@common/utils/rate-limit.util";
import { RedisService } from "@module/(sockets)/services/redis.service";
import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";

/**
 * Per-member submission limits so nobody can race the ladder or flood the feed.
 * Fixed window counters in Redis. If Redis is unavailable requests are allowed (and logged)
 * unless RATE_LIMIT_FAIL_CLOSED=true.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
    private readonly logger = new Logger(RateLimitGuard.name);
    private readonly enabled: boolean;
    private readonly failClosed: boolean;
    private readonly rules: Record<RateLimitName, RateLimitRule>;

    constructor(
        private readonly reflector: Reflector,
        private readonly redis: RedisService,
        config: ConfigService,
    ) {
        const get = (key: string) => config.get<string>(key);
        this.enabled = (get("RATE_LIMIT_ENABLED") || "true").trim().toLowerCase() !== "false";
        this.failClosed =
            (get("RATE_LIMIT_FAIL_CLOSED") || "false").trim().toLowerCase() === "true";
        // Resolved eagerly so a bad value stops the app at boot, not on a member's request
        this.rules = Object.fromEntries(
            RATE_LIMIT_NAMES.map((name) => [name, resolveRateLimitRule(name, get)]),
        ) as Record<RateLimitName, RateLimitRule>;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const name = this.reflector.getAllAndOverride<RateLimitName | undefined>(RATE_LIMIT_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!name || !this.enabled) return true;

        const http = context.switchToHttp();
        const request = http.getRequest<RequestWithUser & { ip?: string }>();
        const subject = request.user?.userId ?? request.ip ?? "anonymous";
        const rule = this.rules[name];

        let allowed: boolean;
        try {
            allowed = await this.redis.checkRateLimit(
                `http:${name}:${subject}`,
                rule.windowMs,
                rule.max,
            );
        } catch (err) {
            const reason = err instanceof Error ? err.message : "unknown error";
            this.logger.warn(`Rate limit check failed for ${name}: ${reason}`);
            if (this.failClosed) {
                throw new ServiceUnavailableException("Unable to process your request right now");
            }
            return true;
        }
        if (allowed) return true;

        const retryAfter = retryAfterSeconds(Date.now(), rule.windowMs);
        http.getResponse<Response>().setHeader("Retry-After", String(retryAfter));
        throw new HttpException(
            {
                statusCode: HttpStatus.TOO_MANY_REQUESTS,
                message: `You are submitting too many ${RATE_LIMIT_LABELS[name]}s. Please try again later.`,
                retryAfterSeconds: retryAfter,
            },
            HttpStatus.TOO_MANY_REQUESTS,
        );
    }
}
