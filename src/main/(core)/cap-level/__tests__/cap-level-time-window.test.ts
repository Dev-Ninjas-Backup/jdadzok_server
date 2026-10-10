/**
 * Minimum time at each level before promotion ("sustained consistency", not a one-day race).
 * Run: npx tsx src/main/(core)/cap-level/__tests__/cap-level-time-window.test.ts
 */
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { CapLevel, Role } from "@prisma/client";
import {
    daysAtCapLevel,
    missingMinimumTimeAtLevel,
    resolveLevelSince,
} from "@common/utils/cap-level.util";
import { CapRequirementsSeedService } from "@lib/seed/services/cap-requirements.seed.service";
import { CapLevelPromotionService } from "../cap-level-promotion.service";
import { CapLevelService } from "../cap-lavel.service";

interface TestCase {
    name: string;
    run: () => Promise<void> | void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

const REQUIREMENTS: Record<string, Record<string, unknown>> = {
    YELLOW: {
        capLevel: "YELLOW",
        minActivityScore: 50,
        minVolunteerHours: null,
        minDaysAtPreviousLevel: 14,
        requiresVerification: false,
        requiresNomination: false,
        adSharePercentage: 10,
    },
    RED: {
        capLevel: "RED",
        minActivityScore: 100,
        minVolunteerHours: null,
        minDaysAtPreviousLevel: 30,
        requiresVerification: true,
        requiresNomination: false,
        adSharePercentage: 20,
    },
    GREEN: {
        capLevel: "GREEN",
        minActivityScore: 1,
        minVolunteerHours: null,
        minDaysAtPreviousLevel: null,
        requiresVerification: false,
        requiresNomination: false,
        adSharePercentage: 2,
    },
};

interface Harness {
    capService: CapLevelService;
    promotions: CapLevelPromotionService;
    updates: { data: Record<string, unknown> }[];
    user: { capLevel: CapLevel; capLevelChangedAt: Date | null; createdAt: Date };
}

function build(
    capLevel: CapLevel,
    capLevelChangedAt: Date | null,
    createdAt = daysAgo(400),
): Harness {
    const user = {
        id: "u1",
        email: "u1@example.org",
        capLevel,
        capLevelChangedAt,
        createdAt,
        metrics: null,
    };
    const metrics = {
        activityScore: 999,
        volunteerHours: 999,
        lifetimeVerifiedVolunteerHours: 999,
    };
    const updates: { data: Record<string, unknown> }[] = [];

    const repository = {
        getUserWithMetrics: async () => ({ ...user, metrics }),
        getCapRequirements: async (level: string) => REQUIREMENTS[level] ?? null,
        createUserMetricsIfNotExists: async () => metrics,
        getUserWithMetricsPlaceholder: undefined,
    };
    const userMetricsService = {
        recalculateAndUpdateActivityScore: async () => metrics,
        getUserMetrics: async () => metrics,
    };
    const tx = {
        user: {
            update: async (args: { data: Record<string, unknown> }) => {
                updates.push(args);
                return { ...user, ...args.data };
            },
        },
        capPromotionAudit: { create: async () => ({}) },
        notification: { create: async () => ({}) },
    };
    const prisma = { $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) };
    const eventEmitter = { emit: () => true };

    const capService = new CapLevelService(repository as never, userMetricsService as never);
    const promotions = new CapLevelPromotionService(
        repository as never,
        capService,
        prisma as never,
        eventEmitter as never,
    );
    return { capService, promotions, updates, user };
}

const cases: TestCase[] = [
    {
        name: "daysAtCapLevel counts whole elapsed days and never goes negative",
        run: () => {
            const now = new Date("2026-02-01T00:00:00Z");
            assert.equal(daysAtCapLevel(new Date("2026-01-01T00:00:00Z"), now), 31);
            assert.equal(daysAtCapLevel(new Date("2026-01-31T12:00:00Z"), now), 0);
            assert.equal(daysAtCapLevel(new Date("2026-03-01T00:00:00Z"), now), 0);
        },
    },
    {
        name: "missingMinimumTimeAtLevel: null / 0 means no wait; otherwise reports progress",
        run: () => {
            assert.equal(missingMinimumTimeAtLevel(null, daysAgo(0)), null);
            assert.equal(missingMinimumTimeAtLevel(0, daysAgo(0)), null);
            assert.equal(missingMinimumTimeAtLevel(14, daysAgo(14)), null);
            assert.equal(
                missingMinimumTimeAtLevel(14, daysAgo(3)),
                "Minimum time at current level: 3/14 days",
            );
        },
    },
    {
        name: "resolveLevelSince falls back to signup date when the level never changed",
        run: () => {
            const created = daysAgo(90);
            assert.equal(
                resolveLevelSince({ capLevelChangedAt: null, createdAt: created }),
                created,
            );
            const changed = daysAgo(2);
            assert.equal(
                resolveLevelSince({ capLevelChangedAt: changed, createdAt: created }),
                changed,
            );
        },
    },
    {
        name: "seed carries the placeholder windows: Yellow 14, Red 30, no wait for Green / Black / Sky Blue",
        run: async () => {
            const created: Record<string, unknown>[] = [];
            const prisma = {
                capRequirements: { count: async () => 0 },
                $transaction: async (
                    fn: (t: {
                        capRequirements: {
                            create: (a: { data: Record<string, unknown> }) => unknown;
                        };
                    }) => Promise<unknown>,
                ) =>
                    fn({
                        capRequirements: {
                            create: async ({ data }: { data: Record<string, unknown> }) => {
                                created.push(data);
                                return data;
                            },
                        },
                    }),
            };
            await new CapRequirementsSeedService(prisma as never).seedCapRequirements();
            const days = Object.fromEntries(
                created.map((c) => [c.capLevel, c.minDaysAtPreviousLevel]),
            );
            assert.equal(days.YELLOW, 14);
            assert.equal(days.RED, 30);
            assert.equal(days.GREEN, undefined);
            assert.equal(days.BLACK, undefined);
            assert.equal(days.SKY_BLUE, undefined);
        },
    },
    {
        name: "eligibility: Green member 3 days in is NOT eligible for Yellow and sees why",
        run: async () => {
            const { capService } = build(CapLevel.GREEN, daysAgo(3));
            const result = await capService.calculateCapEligibility("u1");
            assert.equal(result.canPromote, false);
            assert.ok(
                result.missingRequirements.some((m) =>
                    m.startsWith("Minimum time at current level: 3/14"),
                ),
            );
        },
    },
    {
        name: "eligibility: Green member 20 days in IS eligible for Yellow",
        run: async () => {
            const { capService } = build(CapLevel.GREEN, daysAgo(20));
            const result = await capService.calculateCapEligibility("u1");
            assert.equal(result.canPromote, true);
            assert.equal(result.eligibleLevel, CapLevel.YELLOW);
        },
    },
    {
        name: "eligibility: a member who never changed level counts from signup (no one is locked out)",
        run: async () => {
            const { capService } = build(CapLevel.GREEN, null, daysAgo(200));
            assert.equal((await capService.calculateCapEligibility("u1")).canPromote, true);
        },
    },
    {
        name: "auto-promotion: blocked inside the window, then promotes once and stamps capLevelChangedAt",
        run: async () => {
            const early = build(CapLevel.GREEN, daysAgo(2));
            assert.deepEqual(await early.promotions.tryAutoPromote("u1"), { promoted: false });
            assert.equal(early.updates.length, 0);

            const ready = build(CapLevel.GREEN, daysAgo(15));
            const before = Date.now();
            assert.deepEqual(await ready.promotions.tryAutoPromote("u1"), {
                promoted: true,
                toLevel: CapLevel.YELLOW,
            });
            const stamped = ready.updates[0].data.capLevelChangedAt as Date;
            assert.ok(stamped.getTime() >= before - 1000);
            assert.equal(ready.updates[0].data.capLevel, CapLevel.YELLOW);
        },
    },
    {
        name: "admin promote Yellow->Red: blocked inside 30 days, allowed after",
        run: async () => {
            const early = build(CapLevel.YELLOW, daysAgo(5));
            await assert.rejects(
                early.promotions.promoteUser(
                    "admin1",
                    "u1",
                    { targetLevel: CapLevel.RED } as never,
                    Role.ADMIN,
                ),
                (err: unknown) =>
                    err instanceof BadRequestException &&
                    err.message.includes("Minimum time at current level: 5/30 days"),
            );
            assert.equal(early.updates.length, 0);

            const ready = build(CapLevel.YELLOW, daysAgo(31));
            await ready.promotions.promoteUser(
                "admin1",
                "u1",
                { targetLevel: CapLevel.RED } as never,
                Role.ADMIN,
            );
            assert.equal(ready.updates[0].data.capLevel, CapLevel.RED);
        },
    },
    {
        name: "admin override with a recorded reason still bypasses the window",
        run: async () => {
            const { promotions, updates } = build(CapLevel.YELLOW, daysAgo(1));
            await promotions.promoteUser(
                "admin1",
                "u1",
                {
                    targetLevel: CapLevel.RED,
                    bypassVerification: true,
                    bypassReason: "board decision",
                } as never,
                Role.ADMIN,
            );
            assert.equal(updates[0].data.capLevel, CapLevel.RED);
        },
    },
    {
        name: "downgrades are never blocked by the window (admin demotes a member promoted yesterday)",
        run: async () => {
            const { promotions, updates } = build(CapLevel.RED, daysAgo(1));
            await promotions.promoteUser(
                "admin1",
                "u1",
                { targetLevel: CapLevel.YELLOW } as never,
                Role.ADMIN,
            );
            assert.equal(updates[0].data.capLevel, CapLevel.YELLOW);
            assert.ok(updates[0].data.capLevelChangedAt instanceof Date);
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
