/**
 * Issue #25 — content moderation layer (post create: allow / queue / reject + admin review).
 * Run: npx tsx src/main/(abuse)/moderation/__tests__/moderation.issue-25.test.ts
 */
process.env.STRIPE_SECRET = "sk_test_unit";

import assert from "node:assert/strict";
import {
    BadRequestException,
    NotFoundException,
    UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ModerationDecision } from "@prisma/client";
import { PostService } from "../../../(posts)/posts/posts.service";
import { runCases, startMockVendor, TestCase } from "../../__tests__/mock-vendor.server";
import {
    MEMORY_MODERATION_QUEUE_MARKER,
    MEMORY_MODERATION_REJECT_MARKER,
    ModerationProviderName,
} from "../moderation.constants";
import { ModerationService } from "../moderation.service";
import { createModerationProvider } from "../providers/moderation-provider.factory";
import { ModerationProvider } from "../providers/moderation-provider.interface";

interface CheckRow {
    id: string;
    userId: string;
    subjectId: string | null;
    decision: ModerationDecision;
    score: number;
    labels: string[];
    provider: string;
    reviewedAt: Date | null;
    reviewedById: string | null;
}

const cfg = (values: Record<string, string>) => new ConfigService(values);

function build(values: Record<string, string>, provider?: ModerationProvider) {
    const checks: CheckRow[] = [];
    const posts = new Map<string, { isHidden: boolean }>();
    const upserts: string[] = [];

    const prisma = {
        moderationCheck: {
            create: async ({
                data,
            }: {
                data: Omit<CheckRow, "id" | "reviewedAt" | "reviewedById" | "subjectId">;
            }) => {
                const row: CheckRow = {
                    id: `c${checks.length + 1}`,
                    subjectId: null,
                    reviewedAt: null,
                    reviewedById: null,
                    ...data,
                };
                checks.push(row);
                return row;
            },
            update: async ({ where, data }: { where: { id: string }; data: Partial<CheckRow> }) => {
                const row = checks.find((c) => c.id === where.id)!;
                Object.assign(row, data);
                return row;
            },
            findUnique: async ({ where }: { where: { id: string } }) =>
                checks.find((c) => c.id === where.id) ?? null,
            count: async () => checks.length,
            findMany: async () => checks,
        },
        post: {
            updateMany: async ({
                where,
                data,
            }: {
                where: { id: string };
                data: { isHidden: boolean };
            }) => {
                const post = posts.get(where.id);
                if (!post) return { count: 0 };
                post.isHidden = data.isHidden;
                return { count: 1 };
            },
        },
    };
    const searchSync = {
        upsertPost: async (id: string) => {
            upserts.push(id);
        },
    };

    const config = cfg(values);
    const service = new ModerationService(
        provider ?? createModerationProvider(config),
        prisma as never,
        config,
        searchSync as never,
    );
    return { service, checks, posts, upserts };
}

const memory = { ABUSE_CONTENT_PROVIDER: "memory" };
const failingProvider: ModerationProvider = {
    name: ModerationProviderName.OPENAI,
    moderate: async () => {
        throw new Error("vendor down");
    },
};

const cases: TestCase[] = [
    {
        name: "factory: default / unknown / openai-without-key fall back to off",
        run: () => {
            assert.equal(createModerationProvider(cfg({})).name, ModerationProviderName.OFF);
            assert.equal(
                createModerationProvider(cfg({ ABUSE_CONTENT_PROVIDER: "nope" })).name,
                ModerationProviderName.OFF,
            );
            assert.equal(
                createModerationProvider(cfg({ ABUSE_CONTENT_PROVIDER: "openai" })).name,
                ModerationProviderName.OFF,
            );
            assert.equal(
                createModerationProvider(
                    cfg({ ABUSE_CONTENT_PROVIDER: "openai", OPENAI_API_KEY: "k" }),
                ).name,
                ModerationProviderName.OPENAI,
            );
        },
    },
    {
        name: "off and blank text: allowed, vendor never needed, no row",
        run: async () => {
            const off = build({});
            assert.equal(
                (await off.service.evaluatePost({ userId: "u1", text: "anything" })).decision,
                "ALLOW",
            );
            const blank = build(memory);
            assert.equal(
                (await blank.service.evaluatePost({ userId: "u1", text: "   " })).decision,
                "ALLOW",
            );
            assert.equal(off.checks.length + blank.checks.length, 0);
        },
    },
    {
        name: "low risk text is allowed and nothing is stored",
        run: async () => {
            const { service, checks } = build(memory);
            const out = await service.evaluatePost({ userId: "u1", text: "Hello community!" });
            assert.equal(out.decision, ModerationDecision.ALLOW);
            assert.equal(checks.length, 0);
        },
    },
    {
        name: "mid score is queued with a check row (labels + score, no post text)",
        run: async () => {
            const { service, checks } = build(memory);
            const out = await service.evaluatePost({
                userId: "u1",
                text: `secret words ${MEMORY_MODERATION_QUEUE_MARKER}`,
            });
            assert.equal(out.decision, ModerationDecision.QUEUE);
            assert.equal(out.checkId, "c1");
            assert.equal(checks[0].score, 70);
            assert.deepEqual(checks[0].labels, ["memory_queue"]);
            assert.ok(!JSON.stringify(checks[0]).includes("secret words"));
        },
    },
    {
        name: "high score is rejected (422) and audited; AUTO_REJECT=false downgrades it to queue",
        run: async () => {
            const strict = build(memory);
            await assert.rejects(
                strict.service.evaluatePost({
                    userId: "u1",
                    text: MEMORY_MODERATION_REJECT_MARKER,
                }),
                UnprocessableEntityException,
            );
            assert.equal(strict.checks[0].decision, ModerationDecision.REJECT);

            const soft = build({ ...memory, ABUSE_CONTENT_AUTO_REJECT: "false" });
            const out = await soft.service.evaluatePost({
                userId: "u1",
                text: MEMORY_MODERATION_REJECT_MARKER,
            });
            assert.equal(out.decision, ModerationDecision.QUEUE);
        },
    },
    {
        name: "thresholds are configurable",
        run: async () => {
            const { service } = build({
                ...memory,
                ABUSE_CONTENT_QUEUE_SCORE: "80",
                ABUSE_CONTENT_REJECT_SCORE: "99",
            });
            const out = await service.evaluatePost({
                userId: "u1",
                text: MEMORY_MODERATION_QUEUE_MARKER,
            });
            assert.equal(out.decision, ModerationDecision.ALLOW);
        },
    },
    {
        name: "vendor failure: fail-open allows, fail-closed queues for review (never rejects)",
        run: async () => {
            const open = build({}, failingProvider);
            assert.equal(
                (await open.service.evaluatePost({ userId: "u1", text: "hi" })).decision,
                "ALLOW",
            );
            const closed = build({ ABUSE_CONTENT_FAIL_CLOSED: "true" }, failingProvider);
            const out = await closed.service.evaluatePost({ userId: "u1", text: "hi" });
            assert.equal(out.decision, ModerationDecision.QUEUE);
            assert.deepEqual(closed.checks[0].labels, ["vendor_error_fail_closed"]);
        },
    },
    {
        name: "openai adapter: bearer auth + model + input, score is the top category, labels are flagged ones",
        run: async () => {
            const vendor = await startMockVendor(() => ({
                json: {
                    id: "modr-1",
                    results: [
                        {
                            flagged: true,
                            categories: { harassment: true, violence: false },
                            category_scores: { harassment: 0.91, violence: 0.02 },
                        },
                    ],
                },
            }));
            try {
                const { service, checks } = build({
                    ABUSE_CONTENT_PROVIDER: "openai",
                    OPENAI_API_KEY: "test-key",
                    OPENAI_API_BASE: vendor.baseUrl,
                });
                await assert.rejects(
                    service.evaluatePost({ userId: "u1", text: "some abusive text" }),
                    UnprocessableEntityException,
                );
                const req = vendor.requests[0];
                assert.equal(req.method, "POST");
                assert.equal(req.url, "/moderations");
                assert.equal(req.headers.authorization, "Bearer test-key");
                const body = JSON.parse(req.body) as { model: string; input: string };
                assert.equal(body.model, "omni-moderation-latest");
                assert.equal(body.input, "some abusive text");
                assert.equal(checks[0].score, 91);
                assert.deepEqual(checks[0].labels, ["harassment"]);
            } finally {
                await vendor.close();
            }
        },
    },
    {
        name: "admin approve: unhides the post, marks reviewed, reindexes search",
        run: async () => {
            const { service, checks, posts, upserts } = build(memory);
            await service.evaluatePost({ userId: "u1", text: MEMORY_MODERATION_QUEUE_MARKER });
            posts.set("p1", { isHidden: true });
            await service.linkPost("c1", "p1");

            await service.approve("c1", "admin-1");
            assert.equal(posts.get("p1")!.isHidden, false);
            assert.equal(checks[0].reviewedById, "admin-1");
            assert.ok(checks[0].reviewedAt);
            assert.deepEqual(upserts, ["p1"]);
            await assert.rejects(service.approve("c1", "admin-1"), BadRequestException);
        },
    },
    {
        name: "admin reject: post stays hidden; unknown, rejected-decision and unlinked checks are 4xx",
        run: async () => {
            const { service, checks, posts } = build(memory);
            await service.evaluatePost({ userId: "u1", text: MEMORY_MODERATION_QUEUE_MARKER });
            posts.set("p1", { isHidden: true });
            await service.linkPost("c1", "p1");
            await service.reject("c1", "admin-1");
            assert.equal(posts.get("p1")!.isHidden, true);
            assert.ok(checks[0].reviewedAt);

            await assert.rejects(service.approve("missing", "admin-1"), NotFoundException);

            await assert.rejects(
                service.evaluatePost({ userId: "u1", text: MEMORY_MODERATION_REJECT_MARKER }),
                UnprocessableEntityException,
            );
            await assert.rejects(service.approve("c2", "admin-1"), BadRequestException);

            await service.evaluatePost({ userId: "u1", text: MEMORY_MODERATION_QUEUE_MARKER });
            await assert.rejects(service.approve("c3", "admin-1"), BadRequestException);
        },
    },
    {
        name: "PostService.create: queued post is stored hidden, linked, flagged UNDER_REVIEW and not broadcast",
        run: async () => {
            const { service } = build(memory);
            const stored: { isHidden?: boolean }[] = [];
            const linked: [string, string][] = [];
            const moderation = {
                evaluatePost: service.evaluatePost.bind(service),
                linkPost: async (checkId: string, postId: string) => {
                    linked.push([checkId, postId]);
                },
            };
            const repository = {
                store: async (input: { isHidden?: boolean }) => {
                    stored.push(input);
                    return {
                        id: "p9",
                        authorId: "u1",
                        createdAt: new Date(),
                        author: { profile: null },
                        text: "t",
                    };
                },
            };
            const followService = {
                getFollowers: async () => {
                    throw new Error("must not notify for a held post");
                },
            };
            const posts = new PostService(
                repository as never,
                followService as never,
                {} as never,
                { emit: () => undefined } as never,
                {} as never,
                moderation as never,
            );
            const res = await posts.create({
                authorId: "u1",
                text: MEMORY_MODERATION_QUEUE_MARKER,
            } as never);
            assert.equal(stored[0].isHidden, true);
            assert.deepEqual(linked, [["c1", "p9"]]);
            assert.equal((res as { moderationStatus?: string }).moderationStatus, "UNDER_REVIEW");
        },
    },
    {
        name: "PostService.create: rejected post is never stored",
        run: async () => {
            const { service } = build(memory);
            let storeCalls = 0;
            const posts = new PostService(
                {
                    store: async () => {
                        storeCalls += 1;
                        return null;
                    },
                } as never,
                {} as never,
                {} as never,
                {} as never,
                {} as never,
                { evaluatePost: service.evaluatePost.bind(service) } as never,
            );
            await assert.rejects(
                posts.create({ authorId: "u1", text: MEMORY_MODERATION_REJECT_MARKER } as never),
                UnprocessableEntityException,
            );
            assert.equal(storeCalls, 0);
        },
    },
];

void runCases(cases);
