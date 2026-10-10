/**
 * Issue #42 — withdraw balance / minimum guards.
 * Run: npx tsx src/main/(pay)/withdraw/__tests__/withdraw.issue-42.test.ts
 */
process.env.STRIPE_SECRET = "sk_test_unit";

import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WithdrawService } from "../withdraw.service";
import {
    DEFAULT_WITHDRAW_MIN_AMOUNT,
    assertWithdrawEligible,
    resolveMinWithdrawAmount,
} from "../withdraw-eligibility.util";

interface TestCase {
    name: string;
    run: () => Promise<void> | void;
}

interface FakeState {
    balance: number;
    committed: number;
    withdrawsCreated: number;
    jobsQueued: number;
}

function buildService(state: FakeState, env: Record<string, string> = {}) {
    const tx = {
        $queryRaw: async () => [{ balance: state.balance }],
        withdraw: {
            aggregate: async () => ({ _sum: { amount: state.committed } }),
            create: async ({ data }: { data: { amount: number } }) => {
                state.withdrawsCreated += 1;
                return { id: "w1", ...data };
            },
        },
    };
    const prisma = {
        user: {
            findUnique: async () => ({
                email: null,
                stripeAccountId: "acct_1",
                profile: { balance: state.balance },
            }),
        },
        $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    };
    const queue = {
        add: async () => {
            state.jobsQueued += 1;
        },
    };
    const config = new ConfigService(env);
    return new WithdrawService(prisma as never, config, queue as never);
}

const newState = (balance: number, committed = 0): FakeState => ({
    balance,
    committed,
    withdrawsCreated: 0,
    jobsQueued: 0,
});

const eligible = (amount: number, balance: number, committed = 0, minAmount = 100) =>
    assertWithdrawEligible({ amount, balance, committed, minAmount });

const cases: TestCase[] = [
    {
        name: "accepts an amount equal to the available balance",
        run: () => eligible(150, 150),
    },
    {
        name: "accepts the exact minimum",
        run: () => eligible(100, 500),
    },
    {
        name: "rejects an amount above the balance",
        run: () => assert.throws(() => eligible(200, 150), BadRequestException),
    },
    {
        name: "rejects an amount below the minimum",
        run: () => assert.throws(() => eligible(99.99, 500), BadRequestException),
    },
    {
        name: "rejects zero, negative, NaN and Infinity",
        run: () => {
            for (const bad of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
                assert.throws(() => eligible(bad, 500, 0, 0), BadRequestException);
            }
        },
    },
    {
        name: "subtracts open and paid withdraws from the available balance",
        run: () => {
            assert.throws(() => eligible(100, 150, 100), BadRequestException);
            eligible(50, 150, 100, 0);
        },
    },
    {
        name: "minimum of 0 disables the floor but not the balance check",
        run: () => {
            eligible(1, 10, 0, 0);
            assert.throws(() => eligible(11, 10, 0, 0), BadRequestException);
        },
    },
    {
        name: "resolveMinWithdrawAmount defaults to 100 and parses config",
        run: () => {
            assert.equal(resolveMinWithdrawAmount(undefined), DEFAULT_WITHDRAW_MIN_AMOUNT);
            assert.equal(resolveMinWithdrawAmount("250"), 250);
            assert.equal(resolveMinWithdrawAmount("0"), 0);
            assert.throws(() => resolveMinWithdrawAmount("abc"));
            assert.throws(() => resolveMinWithdrawAmount("-1"));
        },
    },
    {
        name: "service: over-balance request creates no withdraw row and no queue job",
        run: async () => {
            const state = newState(150);
            const service = buildService(state);
            await assert.rejects(service.requestWithdraw("u1", { amount: 200 }), BadRequestException);
            assert.equal(state.withdrawsCreated, 0);
            assert.equal(state.jobsQueued, 0);
        },
    },
    {
        name: "service: second request while the first is pending is rejected",
        run: async () => {
            const state = newState(150, 150);
            const service = buildService(state);
            await assert.rejects(service.requestWithdraw("u1", { amount: 100 }), BadRequestException);
            assert.equal(state.withdrawsCreated, 0);
            assert.equal(state.jobsQueued, 0);
        },
    },
    {
        name: "service: valid request creates one row and one queue job",
        run: async () => {
            const state = newState(500);
            const service = buildService(state);
            const result = await service.requestWithdraw("u1", { amount: 100 });
            assert.equal(result.withdrawId, "w1");
            assert.equal(state.withdrawsCreated, 1);
            assert.equal(state.jobsQueued, 1);
        },
    },
    {
        name: "service: WITHDRAW_MIN_AMOUNT from config is enforced",
        run: async () => {
            const state = newState(500);
            const service = buildService(state, { WITHDRAW_MIN_AMOUNT: "200" });
            await assert.rejects(service.requestWithdraw("u1", { amount: 150 }), BadRequestException);
            assert.equal(state.withdrawsCreated, 0);
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
