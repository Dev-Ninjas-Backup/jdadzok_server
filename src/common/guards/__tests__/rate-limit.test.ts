/**
 * Submission rate limiting (posts, comments, endorsements, hour logs), per member.
 * Run: npx tsx src/common/guards/__tests__/rate-limit.test.ts
 */
import assert from "node:assert/strict";
import { HttpException, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { RATE_LIMIT_KEY, RateLimit } from "@common/decorators/rate-limit.decorator";
import { RateLimitGuard } from "@common/guards/rate-limit.guard";
import {
    RATE_LIMIT_DEFAULTS,
    RateLimitName,
    resolveRateLimitRule,
    retryAfterSeconds,
} from "@common/utils/rate-limit.util";
import { RedisService } from "@module/(sockets)/services/redis.service";
import { PostController } from "../../../main/(posts)/posts/posts.controller";
import { CommentController } from "../../../main/(posts)/comments/comment.controller";
import { VolunteerController } from "../../../main/volunteer/volunteer.controller";

interface TestCase {
    name: string;
    run: () => Promise<void> | void;
}

/** In-memory stand-in for the ioredis calls RedisService.checkRateLimit makes. */
function fakeRedisClient() {
    const counters = new Map<string, number>();
    return {
        calls: 0,
        counters,
        incr: async function (key: string) {
            this.calls += 1;
            const next = (counters.get(key) ?? 0) + 1;
            counters.set(key, next);
            return next;
        },
        expire: async () => 1,
    };
}

function build(env: Record<string, string> = {}, client: unknown = fakeRedisClient()) {
    const config = new ConfigService(env);
    const redis = new RedisService(config);
    (redis as unknown as { redisClient: unknown }).redisClient = client;
    const guard = new RateLimitGuard(new Reflector(), redis, config);
    return { guard, client: client as ReturnType<typeof fakeRedisClient> };
}

class Handlers {
    @RateLimit("POST")
    limited() {
        return true;
    }

    unlimited() {
        return true;
    }
}

function contextFor(
    handler: () => boolean,
    userId: string | undefined,
    headers: Record<string, string> = {},
) {
    const request = { user: userId ? { userId } : undefined, ip: "10.0.0.1" };
    const response = { setHeader: (k: string, v: string) => void (headers[k] = v) };
    return {
        getHandler: () => handler,
        getClass: () => Handlers,
        switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as never;
}

/** The decorated function itself, read without detaching a method from its class. */
const handlerOf = (proto: object, name: string) =>
    Object.getOwnPropertyDescriptor(proto, name)?.value as () => boolean;

const limited = handlerOf(Handlers.prototype, "limited");
const unlimited = handlerOf(Handlers.prototype, "unlimited");

async function expect429(promise: Promise<unknown>) {
    try {
        await promise;
    } catch (err) {
        assert.ok(err instanceof HttpException, "expected an HttpException");
        assert.equal(err.getStatus(), 429);
        return err.getResponse() as { retryAfterSeconds: number; message: string };
    }
    assert.fail("expected the request to be rate limited");
}

const cases: TestCase[] = [
    {
        name: "placeholder defaults: posts 20/h, comments 60/h, endorsements 10/day, hour logs 20/day",
        run: () => {
            assert.deepEqual(RATE_LIMIT_DEFAULTS.POST, { max: 20, windowSeconds: 3600 });
            assert.deepEqual(RATE_LIMIT_DEFAULTS.COMMENT, { max: 60, windowSeconds: 3600 });
            assert.deepEqual(RATE_LIMIT_DEFAULTS.ENDORSEMENT, { max: 10, windowSeconds: 86_400 });
            assert.deepEqual(RATE_LIMIT_DEFAULTS.HOUR_LOG, { max: 20, windowSeconds: 86_400 });
        },
    },
    {
        name: "env overrides a rule; invalid values throw instead of silently disabling the limit",
        run: () => {
            const get = (env: Record<string, string>) => (key: string) => env[key];
            assert.deepEqual(
                resolveRateLimitRule(
                    "POST",
                    get({ RATE_LIMIT_POST_MAX: "5", RATE_LIMIT_POST_WINDOW_SECONDS: "60" }),
                ),
                { max: 5, windowMs: 60_000 },
            );
            for (const bad of ["0", "-3", "abc", "2.5"]) {
                assert.throws(() =>
                    resolveRateLimitRule("POST", get({ RATE_LIMIT_POST_MAX: bad })),
                );
            }
            assert.throws(() => build({ RATE_LIMIT_COMMENT_WINDOW_SECONDS: "0" }));
        },
    },
    {
        name: "retryAfterSeconds is the time left in the current window, at least 1",
        run: () => {
            assert.equal(retryAfterSeconds(0, 60_000), 60);
            assert.equal(retryAfterSeconds(59_500, 60_000), 1);
            assert.equal(retryAfterSeconds(30_000, 60_000), 30);
        },
    },
    {
        name: "allows up to the limit, then answers 429 with Retry-After and a clear message",
        run: async () => {
            const { guard } = build({
                RATE_LIMIT_POST_MAX: "3",
                RATE_LIMIT_POST_WINDOW_SECONDS: "3600",
            });
            const headers: Record<string, string> = {};
            for (let i = 0; i < 3; i++) {
                assert.equal(await guard.canActivate(contextFor(limited, "u1", headers)), true);
            }
            const body = await expect429(guard.canActivate(contextFor(limited, "u1", headers)));
            assert.ok(body.retryAfterSeconds >= 1 && body.retryAfterSeconds <= 3600);
            assert.equal(headers["Retry-After"], String(body.retryAfterSeconds));
            assert.match(body.message, /too many posts/);
        },
    },
    {
        name: "limits are per member: one member hitting the limit does not block another",
        run: async () => {
            const { guard } = build({ RATE_LIMIT_POST_MAX: "1" });
            await guard.canActivate(contextFor(limited, "u1"));
            await expect429(guard.canActivate(contextFor(limited, "u1")));
            assert.equal(await guard.canActivate(contextFor(limited, "u2")), true);
        },
    },
    {
        name: "limits are per rule: the post limit does not use up the comment limit",
        run: async () => {
            const { guard, client } = build({ RATE_LIMIT_POST_MAX: "1" });
            await guard.canActivate(contextFor(limited, "u1"));
            const keys = [...client.counters.keys()];
            assert.ok(keys.every((k) => k.includes("http:POST:u1")));
            class Comments {
                @RateLimit("COMMENT")
                create() {
                    return true;
                }
            }
            const ctx = {
                getHandler: () => handlerOf(Comments.prototype, "create"),
                getClass: () => Comments,
                switchToHttp: () => ({
                    getRequest: () => ({ user: { userId: "u1" } }),
                    getResponse: () => ({ setHeader: () => undefined }),
                }),
            } as never;
            assert.equal(await guard.canActivate(ctx), true);
        },
    },
    {
        name: "the window rolls over: the member can submit again in the next window",
        run: async () => {
            const { guard } = build({
                RATE_LIMIT_POST_MAX: "1",
                RATE_LIMIT_POST_WINDOW_SECONDS: "60",
            });
            const realNow = Date.now;
            try {
                Date.now = () => 1_000_000_000_000;
                await guard.canActivate(contextFor(limited, "u1"));
                await expect429(guard.canActivate(contextFor(limited, "u1")));
                Date.now = () => 1_000_000_000_000 + 61_000;
                assert.equal(await guard.canActivate(contextFor(limited, "u1")), true);
            } finally {
                Date.now = realNow;
            }
        },
    },
    {
        name: "routes without @RateLimit and a disabled limiter never touch Redis",
        run: async () => {
            const open = build({ RATE_LIMIT_POST_MAX: "1" });
            assert.equal(await open.guard.canActivate(contextFor(unlimited, "u1")), true);
            assert.equal(open.client.calls, 0);

            const off = build({ RATE_LIMIT_ENABLED: "false", RATE_LIMIT_POST_MAX: "1" });
            for (let i = 0; i < 5; i++)
                assert.equal(await off.guard.canActivate(contextFor(limited, "u1")), true);
            assert.equal(off.client.calls, 0);
        },
    },
    {
        name: "Redis failure: allowed by default (logged), 503 when RATE_LIMIT_FAIL_CLOSED=true",
        run: async () => {
            const broken = {
                incr: async () => {
                    throw new Error("redis down");
                },
                expire: async () => 1,
            };
            const open = build({}, broken);
            assert.equal(await open.guard.canActivate(contextFor(limited, "u1")), true);

            const closed = build({ RATE_LIMIT_FAIL_CLOSED: "true" }, broken);
            await assert.rejects(
                closed.guard.canActivate(contextFor(limited, "u1")),
                ServiceUnavailableException,
            );

            const noClient = build({}, undefined);
            assert.equal(await noClient.guard.canActivate(contextFor(limited, "u1")), true);
        },
    },
    {
        name: "the submission routes are wired: each has its rule and RateLimitGuard after JwtAuthGuard",
        run: () => {
            const wired: [string, object, string, RateLimitName][] = [
                ["POST /posts", PostController.prototype, "store", "POST"],
                ["POST /comments", CommentController.prototype, "create", "COMMENT"],
                [
                    "PATCH /volunteer/hours/:hourId/endorse",
                    VolunteerController.prototype,
                    "endorseHours",
                    "ENDORSEMENT",
                ],
                [
                    "PATCH /volunteer/log-hours/:applicationId",
                    VolunteerController.prototype,
                    "logHours",
                    "HOUR_LOG",
                ],
            ];
            for (const [label, proto, method, rule] of wired) {
                const handler = (proto as Record<string, unknown>)[method] as object;
                assert.equal(Reflect.getMetadata(RATE_LIMIT_KEY, handler), rule, `${label} rule`);
                const methodGuards = (Reflect.getMetadata("__guards__", handler) ??
                    []) as unknown[];
                const classGuards = (Reflect.getMetadata("__guards__", proto.constructor) ??
                    []) as unknown[];
                const all = [...classGuards, ...methodGuards];
                const rateIndex = all.indexOf(RateLimitGuard);
                const jwtIndex = all.findIndex(
                    (g) => (g as { name?: string }).name === "JwtAuthGuard",
                );
                assert.ok(rateIndex >= 0, `${label} must use RateLimitGuard`);
                assert.ok(
                    jwtIndex >= 0 && jwtIndex < rateIndex,
                    `${label}: JwtAuthGuard must run before RateLimitGuard`,
                );
            }
        },
    },
];

async function main() {
    let failed = 0;
    for (const tc of cases) {
        try {
            await tc.run();
            console.log(`  PASS  ${tc.name}`);
        } catch (err) {
            failed += 1;
            console.log(`  FAIL  ${tc.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    console.log(`\n${cases.length - failed}/${cases.length} passed`);
    if (failed > 0) process.exit(1);
}

void main();
