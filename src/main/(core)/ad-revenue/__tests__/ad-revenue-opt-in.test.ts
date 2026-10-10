/**
 * Ad revenue is opt-in (off by default) at every cap level.
 * Run: npx tsx src/main/(core)/ad-revenue/__tests__/ad-revenue-opt-in.test.ts
 */
process.env.STRIPE_SECRET = "sk_test_unit";

import assert from "node:assert/strict";
import { NotFoundException } from "@nestjs/common";
import { CapLevel } from "@prisma/client";
import { HelperService } from "../../../(marketplace)/product/helper/helper";
import { AdRevenueService } from "../ad-revenue.service";
import { SetAdRevenueOptInDto } from "../../cap-level/dto/ad-revenue-opt-in.dto";
import { validate } from "class-validator";
import { mapCapStatusForPersonalDashboard } from "@common/utils/soft-earnings.util";

interface TestCase {
    name: string;
    run: () => Promise<void> | void;
}

interface FakeUser {
    id: string;
    capLevel: CapLevel;
    adRevenueOptIn: boolean;
    metrics: { activityScore: number; volunteerHours: number };
}

const LEVELS: CapLevel[] = [
    CapLevel.GREEN,
    CapLevel.YELLOW,
    CapLevel.RED,
    CapLevel.BLACK,
    CapLevel.SKY_BLUE,
];

const requirements = LEVELS.map((capLevel) => ({
    capLevel,
    adSharePercentage: 10,
    minVolunteerHours: 0,
}));

function makeUsers(): FakeUser[] {
    return LEVELS.flatMap((capLevel) => [
        {
            id: `${capLevel}-in`,
            capLevel,
            adRevenueOptIn: true,
            metrics: { activityScore: 0, volunteerHours: 999 },
        },
        {
            id: `${capLevel}-out`,
            capLevel,
            adRevenueOptIn: false,
            metrics: { activityScore: 0, volunteerHours: 999 },
        },
    ]);
}

function buildRevenueService(users: FakeUser[]) {
    const seenWhere: unknown[] = [];
    const prisma = {
        adRevenueShare: { findFirst: async () => null },
        user: {
            findMany: async ({
                where,
            }: {
                where: { adRevenueOptIn?: boolean; capLevel: { not: string } };
            }) => {
                seenWhere.push(where);
                return users.filter(
                    (u) =>
                        u.capLevel !== where.capLevel.not &&
                        (where.adRevenueOptIn === undefined ||
                            u.adRevenueOptIn === where.adRevenueOptIn),
                );
            },
            findUnique: async ({ where }: { where: { id: string } }) =>
                users.find((u) => u.id === where.id) ?? null,
            update: async ({
                where,
                data,
            }: {
                where: { id: string };
                data: { adRevenueOptIn: boolean };
            }) => {
                const user = users.find((u) => u.id === where.id)!;
                user.adRevenueOptIn = data.adRevenueOptIn;
                return { adRevenueOptIn: user.adRevenueOptIn };
            },
        },
        capRequirements: { findMany: async () => requirements },
    };
    return {
        service: new AdRevenueService(prisma as never, {} as never, {} as never),
        seenWhere,
    };
}

const cases: TestCase[] = [
    {
        name: "monthly distribution pays only opted-in users, at every cap level",
        run: async () => {
            const { service } = buildRevenueService(makeUsers());
            const result = await service.calculateMonthlyRevenue({
                month: 10,
                year: 2026,
                totalPlatformRevenue: 1000,
                dryRun: true,
            });
            assert.equal(result.totalUsers, LEVELS.length);
            for (const level of LEVELS) {
                assert.equal(
                    result.distributionByLevel[level].userCount,
                    1,
                    `${level} should have 1 paid user`,
                );
            }
        },
    },
    {
        name: "nobody opted in means nothing is distributed",
        run: async () => {
            const users = makeUsers().map((u) => ({ ...u, adRevenueOptIn: false }));
            const { service } = buildRevenueService(users);
            const result = await service.calculateMonthlyRevenue({
                month: 10,
                year: 2026,
                totalPlatformRevenue: 1000,
                dryRun: true,
            });
            assert.equal(result.totalUsers, 0);
            assert.equal(result.totalDistributed, 0);
        },
    },
    {
        name: "opt-in toggles on and off for a user and returns the new value",
        run: async () => {
            const users = makeUsers();
            const { service } = buildRevenueService(users);
            assert.deepEqual(await service.setAdRevenueOptIn("GREEN-out", true), {
                adRevenueOptIn: true,
            });
            assert.equal(users.find((u) => u.id === "GREEN-out")!.adRevenueOptIn, true);
            assert.deepEqual(await service.setAdRevenueOptIn("GREEN-out", false), {
                adRevenueOptIn: false,
            });
        },
    },
    {
        name: "opt-in for an unknown user is a 404",
        run: async () => {
            const { service } = buildRevenueService(makeUsers());
            await assert.rejects(service.setAdRevenueOptIn("missing", true), NotFoundException);
        },
    },
    {
        name: "DTO accepts only a boolean optIn",
        run: async () => {
            const ok = Object.assign(new SetAdRevenueOptInDto(), { optIn: true });
            assert.equal((await validate(ok)).length, 0);
            for (const bad of ["yes", 1, null, undefined]) {
                const dto = Object.assign(new SetAdRevenueOptInDto(), { optIn: bad });
                assert.ok(
                    (await validate(dto)).length > 0,
                    `optIn=${String(bad)} must be rejected`,
                );
            }
        },
    },
    {
        name: "post-ad attachment only considers authors who opted in",
        run: async () => {
            let postWhere: { author?: { capLevel?: unknown; adRevenueOptIn?: boolean } } = {};
            const prisma = {
                product: { findUnique: async () => ({ id: "prod1", promotionFee: 100, spent: 0 }) },
                post: {
                    findMany: async ({ where }: { where: typeof postWhere }) => {
                        postWhere = where;
                        return [];
                    },
                },
            };
            await new HelperService(prisma as never).attachProductToEligiblePosts("prod1");
            assert.equal(postWhere.author?.adRevenueOptIn, true);
            assert.deepEqual(postWhere.author?.capLevel, { not: "NONE" });
        },
    },
    {
        name: "personal status exposes adRevenueOptIn so the app can render the switch",
        run: () => {
            const status = {
                user: { id: "u1", adRevenueOptIn: false },
                currentLevel: CapLevel.GREEN,
                nextLevel: CapLevel.YELLOW,
                progressPercentage: 0,
                eligibility: {},
                earning: {
                    effectiveSharePercentage: 2,
                    nominalSharePercentage: 2,
                    earningAtRedRate: false,
                    blackVolunteerHoursRequired: 320,
                },
                currentRequirements: null,
                nextRequirements: null,
                metrics: null,
            };
            const data = mapCapStatusForPersonalDashboard(status as never);
            assert.equal(data.adRevenueOptIn, false);
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
