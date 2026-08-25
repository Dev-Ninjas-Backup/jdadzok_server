/**
 * Issue #28 — Account fraud vendor P3 self-test (no custom ML).
 * Run: npx tsx src/main/(abuse)/fraud/__tests__/fraud.issue-28.test.ts
 */
import assert from "node:assert/strict";
import { FraudDecision, FraudEventType } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import { createFraudProvider } from "../providers/fraud-provider.factory";
import { OffFraudProvider } from "../providers/off.provider";
import { MemoryFraudProvider } from "../providers/memory.provider";
import { FraudProviderName } from "../fraud.constants";
import { mapScoreToDecision } from "../fraud.types";

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
        name: "factory: ABUSE_FRAUD_PROVIDER=off → OffFraudProvider",
        run() {
            const provider = createFraudProvider({
                get: (k: string) => (k === "ABUSE_FRAUD_PROVIDER" ? "off" : undefined),
            } as ConfigService);
            assert.equal(provider.name, FraudProviderName.OFF);
        },
    },
    {
        name: "factory: sift without key falls back to off",
        run() {
            const provider = createFraudProvider({
                get: (k: string) => (k === "ABUSE_FRAUD_PROVIDER" ? "sift" : undefined),
            } as ConfigService);
            assert.equal(provider.name, FraudProviderName.OFF);
        },
    },
    {
        name: "factory: seon without key falls back to off",
        run() {
            const provider = createFraudProvider({
                get: (k: string) => (k === "ABUSE_FRAUD_PROVIDER" ? "seon" : undefined),
            } as ConfigService);
            assert.equal(provider.name, FraudProviderName.OFF);
        },
    },
    {
        name: "factory: castle without key falls back to off",
        run() {
            const provider = createFraudProvider({
                get: (k: string) => (k === "ABUSE_FRAUD_PROVIDER" ? "castle" : undefined),
            } as ConfigService);
            assert.equal(provider.name, FraudProviderName.OFF);
        },
    },
    {
        name: "factory: memory → MemoryFraudProvider",
        run() {
            const provider = createFraudProvider({
                get: (k: string) => (k === "ABUSE_FRAUD_PROVIDER" ? "memory" : undefined),
            } as ConfigService);
            assert.equal(provider.name, FraudProviderName.MEMORY);
        },
    },
    {
        name: "factory: unknown provider → off",
        run() {
            const provider = createFraudProvider({
                get: (k: string) => (k === "ABUSE_FRAUD_PROVIDER" ? "custom-ml" : undefined),
            } as ConfigService);
            assert.equal(provider.name, FraudProviderName.OFF);
        },
    },
    {
        name: "policy: score maps to ALLOW / CHALLENGE / QUEUE / REJECT",
        run() {
            assert.equal(mapScoreToDecision(10, 60, 85), FraudDecision.ALLOW);
            assert.equal(mapScoreToDecision(35, 60, 85), FraudDecision.CHALLENGE);
            assert.equal(mapScoreToDecision(70, 60, 85), FraudDecision.QUEUE);
            assert.equal(mapScoreToDecision(90, 60, 85), FraudDecision.REJECT);
        },
    },
    {
        name: "off provider always returns score 0",
        async run() {
            const provider = new OffFraudProvider();
            const result = await provider.score({
                userId: "u1",
                email: "fraud@example.com",
                eventType: FraudEventType.STRIPE_ONBOARDING,
            });
            assert.equal(result.score, 0);
            assert.ok(result.labels.includes("provider_off"));
        },
    },
    {
        name: "memory: low-risk email stays low",
        async run() {
            const provider = new MemoryFraudProvider();
            const result = await provider.score({
                userId: "u1",
                email: "ama@synqulan.test",
                eventType: FraudEventType.STRIPE_ONBOARDING,
            });
            assert.ok(result.score < 60);
        },
    },
    {
        name: "memory: fraud email maps to reject band",
        async run() {
            const provider = new MemoryFraudProvider();
            const result = await provider.score({
                userId: "u2",
                email: "fraud.actor@example.com",
                eventType: FraudEventType.PAYOUT,
                amountCents: 1000,
            });
            assert.ok(result.score >= 85);
            assert.ok(result.labels.includes("memory_high_risk_email"));
        },
    },
    {
        name: "memory: risky email maps to queue band",
        async run() {
            const provider = new MemoryFraudProvider();
            const result = await provider.score({
                userId: "u3",
                email: "risky.user@example.com",
                eventType: FraudEventType.ACCOUNT_CHECK,
            });
            assert.ok(result.score >= 60 && result.score < 85);
        },
    },
    {
        name: "memory: large payout elevates score",
        async run() {
            const provider = new MemoryFraudProvider();
            const result = await provider.score({
                userId: "u4",
                email: "clean@example.com",
                eventType: FraudEventType.PAYOUT,
                amountCents: 600_000,
            });
            assert.ok(result.score >= 60);
            assert.ok(result.labels.includes("memory_large_payout"));
        },
    },
    {
        name: "no custom ML — only plug-in provider names exist",
        run() {
            const names = Object.values(FraudProviderName);
            assert.deepEqual(names.sort(), ["castle", "memory", "off", "seon", "sift"].sort());
        },
    },
];

async function main() {
    console.log("\nIssue #28 — Fraud vendor P3 self-test\n");
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
