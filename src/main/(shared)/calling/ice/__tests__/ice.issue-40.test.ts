/**
 * Issue #40 — TURN relay for calls.
 * Run: npx tsx "src/main/(shared)/calling/ice/__tests__/ice.issue-40.test.ts"
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { ConfigService } from "@nestjs/config";

import { buildIceServers, buildTimeLimitedCredential } from "../ice.builder";
import { DEFAULT_STUN_URLS, DEFAULT_TURN_TTL_SECONDS } from "../ice.constants";

/** Stand-in for ConfigService, so the builder is exercised without booting Nest. */
const env = (values: Record<string, string | undefined>) =>
    ({ get: (key: string) => values[key] }) as ConfigService;

const turnServers = (servers: ReturnType<typeof buildIceServers>) =>
    servers.filter((server) => server.urls.startsWith("turn"));

interface TestCase {
    name: string;
    run: () => Promise<void> | void;
}

const results: { name: string; ok: boolean; error?: string; ms: number }[] = [];

async function runCase(tc: TestCase) {
    const started = Date.now();
    try {
        await tc.run();
        results.push({ name: tc.name, ok: true, ms: Date.now() - started });
        console.log(`  PASS  ${tc.name} (${Date.now() - started}ms)`);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({
            name: tc.name,
            ok: false,
            error: message,
            ms: Date.now() - started,
        });
        console.log(`  FAIL  ${tc.name}: ${message}`);
    }
}

const cases: TestCase[] = [
    {
        name: "unconfigured: STUN-only, exactly as before the fix",
        run() {
            const servers = buildIceServers(env({}));
            assert.deepEqual(
                servers,
                DEFAULT_STUN_URLS.map((url) => ({ urls: url })),
            );
            assert.equal(turnServers(servers).length, 0);
        },
    },
    {
        name: "empty TURN_URL does not enable TURN",
        run() {
            const servers = buildIceServers(env({ TURN_URL: "   " }));
            assert.equal(turnServers(servers).length, 0);
        },
    },
    {
        name: "STUN_URL override replaces the default pool",
        run() {
            const servers = buildIceServers(env({ STUN_URL: "stun:my.stun:3478" }));
            assert.deepEqual(servers, [{ urls: "stun:my.stun:3478" }]);
        },
    },
    {
        name: "TURN_SECRET mints a time-limited credential, one entry per URL",
        run() {
            // Fixed clock + TTL so the credential is a stable, checkable value.
            const now = new Date("2024-01-01T00:00:00Z");
            const { username, credential } = buildTimeLimitedCredential(
                "synqulan-test-secret",
                "user-1",
                3600,
                now,
            );

            assert.equal(username, "1704070800:user-1");
            // base64(HMAC-SHA1(secret, username)) — coturn's documented REST form.
            assert.equal(credential, "RiTl5qW3411dBvk41n/NER/t5U8=");
            assert.equal(
                credential,
                createHmac("sha1", "synqulan-test-secret").update(username).digest("base64"),
            );
        },
    },
    {
        name: "TURN entries carry the credential and both transports",
        run() {
            const servers = buildIceServers(
                env({
                    TURN_URL:
                        "turn:turn.synqulan.com:3478?transport=udp,turn:turn.synqulan.com:3478?transport=tcp",
                    TURN_SECRET: "synqulan-test-secret",
                }),
                "user-1",
            );

            const turn = turnServers(servers);
            assert.equal(turn.length, 2, "udp and tcp are separate entries");
            assert.deepEqual(
                turn.map((server) => server.urls),
                [
                    "turn:turn.synqulan.com:3478?transport=udp",
                    "turn:turn.synqulan.com:3478?transport=tcp",
                ],
            );
            for (const server of turn) {
                assert.ok(server.credential, "a credential is required or the relay refuses us");
                assert.ok(server.username?.endsWith(":user-1"), server.username);
            }
            // STUN stays in the list — TURN is a fallback, not a replacement.
            assert.equal(servers.length - turn.length, DEFAULT_STUN_URLS.length);
        },
    },
    {
        name: "static credentials pass through for a non-REST TURN server",
        run() {
            const turn = turnServers(
                buildIceServers(
                    env({
                        TURN_URL: "turns:turn.synqulan.com:5349?transport=tcp",
                        TURN_USERNAME: "synqulan",
                        TURN_PASSWORD: "hunter2",
                    }),
                ),
            );

            assert.deepEqual(turn, [
                {
                    urls: "turns:turn.synqulan.com:5349?transport=tcp",
                    username: "synqulan",
                    credential: "hunter2",
                },
            ]);
        },
    },
    {
        name: "TURN_URL without any credential fails closed, not open",
        run() {
            // An unauthenticated relay the client cannot use would still burn the ICE
            // timeout, so it is better to advertise none and stay STUN-only.
            const servers = buildIceServers(env({ TURN_URL: "turn:turn.synqulan.com:3478" }));
            assert.equal(turnServers(servers).length, 0);
            assert.equal(servers.length, DEFAULT_STUN_URLS.length);
        },
    },
    {
        name: "a half-configured credential pair is not enough",
        run() {
            const servers = buildIceServers(
                env({
                    TURN_URL: "turn:turn.synqulan.com:3478",
                    TURN_USERNAME: "synqulan",
                }),
            );
            assert.equal(turnServers(servers).length, 0);
        },
    },
    {
        name: "TURN_TTL_SECONDS is honoured, and junk falls back to the default",
        run() {
            const expiryOf = (ttl: string) => {
                const servers = turnServers(
                    buildIceServers(
                        env({
                            TURN_URL: "turn:turn.synqulan.com:3478",
                            TURN_SECRET: "s",
                            TURN_TTL_SECONDS: ttl,
                        }),
                    ),
                );
                const expiry = Number(servers[0].username?.split(":")[0]);
                return Math.round(expiry - Date.now() / 1000);
            };

            assert.ok(Math.abs(expiryOf("60") - 60) <= 2, "explicit TTL");
            assert.ok(Math.abs(expiryOf("nonsense") - DEFAULT_TURN_TTL_SECONDS) <= 2, "junk TTL");
            assert.ok(Math.abs(expiryOf("") - DEFAULT_TURN_TTL_SECONDS) <= 2, "empty TTL");
        },
    },
    {
        name: "identity defaults to synqulan and accepts the caller's userId",
        run() {
            const [withDefault] = turnServers(
                buildIceServers(env({ TURN_URL: "turn:t:3478", TURN_SECRET: "s" })),
            );
            const [withUser] = turnServers(
                buildIceServers(env({ TURN_URL: "turn:t:3478", TURN_SECRET: "s" }), "user-42"),
            );

            assert.equal(withDefault.username?.split(":")[1], "synqulan");
            assert.equal(withUser.username?.split(":")[1], "user-42");
        },
    },
    {
        name: "either peer's independently minted credential validates at the relay",
        run() {
            // Both sides of a call fetch the room separately, so they get their own
            // credential. coturn accepts any credential whose HMAC checks out and whose
            // expiry is still in the future — it does not require them to be equal.
            const secret = "shared-secret";
            const validFor = (identity: string) => {
                const { username, credential } = buildTimeLimitedCredential(secret, identity, 3600);
                return createHmac("sha1", secret).update(username).digest("base64") === credential;
            };

            assert.ok(validFor("user-a"));
            assert.ok(validFor("user-b"));
            assert.notEqual(
                buildTimeLimitedCredential(secret, "user-a", 3600).username,
                buildTimeLimitedCredential(secret, "user-b", 3600).username,
                "identities are distinguishable in the relay's logs",
            );
            // The secret itself never has to reach a client.
            assert.ok(
                !JSON.stringify(
                    buildIceServers(
                        env({ TURN_URL: "turn:t:3478", TURN_SECRET: secret }),
                        "user-a",
                    ),
                ).includes(secret),
            );
        },
    },
];

async function main() {
    console.log("\nIssue #40 — TURN relay for calls self-test\n");
    for (const tc of cases) {
        await runCase(tc);
    }
    const failed = results.filter((r) => !r.ok);
    console.log(
        `\n${results.length - failed.length}/${results.length} passed` +
            (failed.length ? ` (${failed.length} failed)` : ""),
    );
    if (failed.length) {
        process.exitCode = 1;
    }
}

void main();
