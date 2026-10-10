/**
 * Impact score: endorsements and verified contribution carry the score; popularity is low and capped.
 * Run: npx tsx src/main/(users)/profile-metrics/__tests__/impact-score.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CapLevel } from "@prisma/client";
import { validate } from "class-validator";
import {
    DEFAULT_IMPACT_SCORE_WEIGHTS,
    calculateImpactScore,
    endorserMultiplier,
    sumEndorsementPoints,
} from "@common/utils/impact-score.util";
import { CreateAdminActivity } from "../../../../(admin)/settings/dto/createadminActivity.dto";
import { UserMetricsService } from "../user-metrics.service";

interface TestCase {
    name: string;
    run: () => Promise<void> | void;
}

interface FakeEndorsement {
    fromUserId: string;
    toUserId: string;
    fromLevel: CapLevel;
}

interface World {
    counts?: {
        posts?: number;
        comments?: number;
        likes?: number;
        shares?: number;
        followers?: number;
    };
    endorsements?: FakeEndorsement[];
    metrics?: { volunteerHours?: number; lifetimeVerifiedVolunteerHours?: number } | null;
    weightsRow?: Record<string, number> | null;
}

const W = DEFAULT_IMPACT_SCORE_WEIGHTS;
const YELLOW_THRESHOLD = 50;

function build(world: World) {
    const calls = { postWhere: undefined as unknown, upsert: undefined as unknown };
    const counts = world.counts ?? {};
    const endorsements = world.endorsements ?? [];

    const prisma = {
        post: {
            count: async ({ where }: { where: unknown }) => {
                calls.postWhere = where;
                return counts.posts ?? 0;
            },
        },
        comment: { count: async () => counts.comments ?? 0 },
        like: { count: async () => counts.likes ?? 0 },
        share: { count: async () => counts.shares ?? 0 },
        follow: { count: async () => counts.followers ?? 0 },
        endorsement: {
            findMany: async ({
                where,
            }: {
                where: { toUserId?: string; fromUserId?: string | { not: string } };
            }) => {
                return endorsements
                    .filter((e) => {
                        if (
                            where.toUserId !== undefined &&
                            typeof where.toUserId === "string" &&
                            e.toUserId !== where.toUserId
                        ) {
                            return false;
                        }
                        if (typeof where.fromUserId === "string")
                            return e.fromUserId === where.fromUserId;
                        if (where.fromUserId && "not" in where.fromUserId) {
                            return e.fromUserId !== where.fromUserId.not;
                        }
                        return true;
                    })
                    .filter((e) => {
                        const toIn = (where as { toUserId?: { in?: string[] } }).toUserId;
                        return typeof toIn === "object" && toIn?.in
                            ? toIn.in.includes(e.toUserId)
                            : true;
                    })
                    .map((e) => ({
                        fromUserId: e.fromUserId,
                        toUserId: e.toUserId,
                        fromUser: { capLevel: e.fromLevel },
                    }));
            },
        },
        userMetrics: {
            findUnique: async () =>
                world.metrics === undefined ? { userId: "me" } : world.metrics,
            upsert: async (args: { update: Record<string, unknown> }) => {
                calls.upsert = args;
                return args.update;
            },
        },
        activityScore: { findFirst: async () => world.weightsRow ?? null },
    };
    return { service: new UserMetricsService(prisma as never), calls };
}

const endorse = (from: string, level: CapLevel, to = "me"): FakeEndorsement => ({
    fromUserId: from,
    toUserId: to,
    fromLevel: level,
});

const cases: TestCase[] = [
    {
        name: "popularity alone is capped below the Yellow threshold, however much a member posts and likes",
        run: async () => {
            const { service } = build({
                counts: {
                    posts: 10_000,
                    comments: 10_000,
                    likes: 100_000,
                    shares: 10_000,
                    followers: 1_000_000,
                },
            });
            const result = await service.calculateImpactScoreBreakdown("me");
            assert.equal(result.popularityPoints, W.popularityCap);
            assert.ok(
                result.total < YELLOW_THRESHOLD,
                `popularity-only score ${result.total} must stay below ${YELLOW_THRESHOLD}`,
            );
        },
    },
    {
        name: "followers and likes carry no points by default (not a popularity contest)",
        run: async () => {
            const { service } = build({ counts: { likes: 500, followers: 500 } });
            assert.equal((await service.calculateImpactScoreBreakdown("me")).total, 0);
        },
    },
    {
        name: "five endorsements from distinct members reach the Yellow threshold on their own",
        run: async () => {
            const { service } = build({
                endorsements: ["a", "b", "c", "d", "e"].map((id) => endorse(id, CapLevel.GREEN)),
            });
            const result = await service.calculateImpactScoreBreakdown("me");
            assert.equal(result.endorsementPoints, 50);
            assert.ok(result.total >= YELLOW_THRESHOLD);
        },
    },
    {
        name: "verified volunteer hours add points, using the verified bank value",
        run: async () => {
            const { service } = build({
                metrics: { lifetimeVerifiedVolunteerHours: 10, volunteerHours: 400 },
            });
            assert.equal(
                (await service.calculateImpactScoreBreakdown("me")).volunteerPoints,
                10 * W.verifiedVolunteerHour,
            );
        },
    },
    {
        name: "repeat endorsements from one member count once",
        run: async () => {
            const { service } = build({
                endorsements: [
                    endorse("a", CapLevel.GREEN),
                    endorse("a", CapLevel.GREEN),
                    endorse("a", CapLevel.GREEN),
                ],
            });
            assert.equal(
                (await service.calculateImpactScoreBreakdown("me")).endorsementPoints,
                W.endorsement,
            );
        },
    },
    {
        name: "self-endorsements and members without a cap level add nothing (no sybil boosting)",
        run: async () => {
            const { service } = build({
                endorsements: [
                    endorse("me", CapLevel.RED),
                    endorse("fresh-account", CapLevel.NONE),
                ],
            });
            assert.equal((await service.calculateImpactScoreBreakdown("me")).endorsementPoints, 0);
        },
    },
    {
        name: "reciprocal endorsements are ignored on both sides",
        run: async () => {
            const swapped = [
                endorse("a", CapLevel.GREEN, "me"),
                endorse("me", CapLevel.GREEN, "a"),
            ];
            const mine = build({ endorsements: swapped });
            assert.equal(
                (await mine.service.calculateImpactScoreBreakdown("me")).endorsementPoints,
                0,
            );
            const theirs = build({ endorsements: swapped });
            assert.equal(
                (await theirs.service.calculateImpactScoreBreakdown("a")).endorsementPoints,
                0,
            );
            const oneWay = build({ endorsements: [endorse("a", CapLevel.GREEN, "me")] });
            assert.equal(
                (await oneWay.service.calculateImpactScoreBreakdown("me")).endorsementPoints,
                W.endorsement,
            );
        },
    },
    {
        name: "endorsements from higher levels weigh more (Green 1.0, Yellow 1.5, Red 2.0, Black 2.5 at bonus 0.5)",
        run: () => {
            assert.equal(endorserMultiplier(CapLevel.GREEN, 0.5), 1);
            assert.equal(endorserMultiplier(CapLevel.YELLOW, 0.5), 1.5);
            assert.equal(endorserMultiplier(CapLevel.RED, 0.5), 2);
            assert.equal(endorserMultiplier(CapLevel.BLACK, 0.5), 2.5);
            assert.equal(endorserMultiplier(CapLevel.SKY_BLUE, 0.5), 2.5);
            assert.equal(endorserMultiplier(CapLevel.NONE, 0.5), 0);
            assert.equal(
                sumEndorsementPoints(
                    [
                        { fromUserId: "a", level: CapLevel.GREEN },
                        { fromUserId: "b", level: CapLevel.RED },
                    ],
                    new Set(),
                    0.5,
                ),
                3,
            );
        },
    },
    {
        name: "weights come from the admin table when a row exists, and defaults apply otherwise",
        run: async () => {
            const defaults = build({ counts: { posts: 4 } });
            assert.equal(
                (await defaults.service.calculateImpactScoreBreakdown("me")).total,
                4 * W.post,
            );

            const custom = build({
                counts: { posts: 4 },
                weightsRow: { ...W, post: 2.5 },
            });
            assert.equal((await custom.service.calculateImpactScoreBreakdown("me")).total, 10);
        },
    },
    {
        name: "posts held by moderation (hidden) earn nothing",
        run: async () => {
            const { service, calls } = build({ counts: { posts: 3 } });
            await service.calculateImpactScoreBreakdown("me");
            assert.deepEqual(calls.postWhere, { authorId: "me", isHidden: false });
        },
    },
    {
        name: "recalculate stores the impact score and the raw counts",
        run: async () => {
            const { service, calls } = build({
                counts: { posts: 2 },
                endorsements: [endorse("a", CapLevel.GREEN)],
            });
            await service.recalculateAndUpdateActivityScore("me");
            const update = (calls.upsert as { update: Record<string, number> }).update;
            assert.equal(update.activityScore, 2 * W.post + W.endorsement);
            assert.equal(update.totalPosts, 2);
        },
    },
    {
        name: "calculateImpactScore keeps the three components separate and rounds to 2 decimals",
        run: () => {
            const result = calculateImpactScore(
                {
                    posts: 3,
                    comments: 3,
                    likesGiven: 0,
                    shares: 1,
                    followers: 0,
                    endorsementPoints: 1.5,
                    verifiedHours: 2.5,
                },
                W,
            );
            assert.equal(result.popularityPoints, 3 * 1 + 3 * 0.5 + 1 * 0.5);
            assert.equal(result.endorsementPoints, 15);
            assert.equal(result.volunteerPoints, 5);
            assert.equal(result.total, 5 + 15 + 5);
        },
    },
    {
        name: "no code path adds to or subtracts from activityScore directly any more (single source)",
        run: () => {
            const files = [
                "src/main/(posts)/likes/like.repository.ts",
                "src/main/(posts)/comments/comment.repository.ts",
                "src/main/(posts)/share/share.service.ts",
            ];
            for (const file of files) {
                const source = readFileSync(file, "utf8");
                assert.ok(
                    !/activityScore:\s*\{\s*(increment|decrement)/.test(source),
                    `${file} still moves activityScore directly`,
                );
            }
        },
    },
    {
        name: "admin settings DTO: new weights are optional, non-negative numbers",
        run: async () => {
            const base = {
                like: 1,
                comment: 1,
                share: 1,
                post: 1,
                greenCapScore: 1,
                yellowCapScore: 1,
                redCapScore: 1,
                blackCapScore: 1,
                productSpentPercentage: 1,
                productPromotionPercentage: 1,
            };
            const without = Object.assign(new CreateAdminActivity(), base);
            assert.equal((await validate(without)).length, 0);
            const withAll = Object.assign(new CreateAdminActivity(), {
                ...base,
                endorsement: 12,
                verifiedVolunteerHour: 3,
                follower: 0,
                popularityCap: 25,
                endorserLevelBonus: 0.4,
            });
            assert.equal((await validate(withAll)).length, 0);
            for (const key of [
                "endorsement",
                "verifiedVolunteerHour",
                "follower",
                "popularityCap",
                "endorserLevelBonus",
            ]) {
                const negative = Object.assign(new CreateAdminActivity(), { ...base, [key]: -1 });
                assert.ok((await validate(negative)).length > 0, `${key}=-1 must be rejected`);
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
