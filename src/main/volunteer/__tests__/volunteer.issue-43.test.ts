/**
 * Issue #43 — mentee can list and dispute auto-verified mentorship hours.
 * Run: npx tsx src/main/volunteer/__tests__/volunteer.issue-43.test.ts
 */
import assert from "node:assert/strict";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Role, VolunteerHourSource, VolunteerHourVerificationStatus } from "@prisma/client";
import { MENTORSHIP_AUTO_VERIFY_DISPUTE_WINDOW_DAYS as WINDOW_DAYS } from "@module/(shared)/calling/mentorship-auto-verify.constants";
import {
    getAutoVerifyDisputeCutoff,
    getAutoVerifyDisputeDeadline,
} from "@common/utils/volunteer-hour.util";
import { VolunteerHourCounterpartyService } from "../volunteer-hour-counterparty.service";

interface TestCase {
    name: string;
    run: () => Promise<void> | void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MENTEE = "mentee-1";
const MENTOR = "mentor-1";

interface FakeHour {
    id: string;
    loggedByUserId: string;
    counterpartyUserId: string | null;
    source: VolunteerHourSource;
    verificationStatus: VolunteerHourVerificationStatus;
    autoVerifiedAt: Date | null;
    isVerified: boolean;
    rejectionNote?: string | null;
}

const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

function makeHour(overrides: Partial<FakeHour> = {}): FakeHour {
    return {
        id: "h1",
        loggedByUserId: MENTOR,
        counterpartyUserId: MENTEE,
        source: VolunteerHourSource.MENTORSHIP_CALL,
        verificationStatus: VolunteerHourVerificationStatus.VERIFIED,
        autoVerifiedAt: daysAgo(1),
        isVerified: true,
        ...overrides,
    };
}

function build(hours: FakeHour[]) {
    const calls = { findManyWhere: undefined as unknown, syncedFor: [] as string[] };
    const prisma = {
        volunteerHour: {
            findMany: async ({ where }: { where: unknown }) => {
                calls.findManyWhere = where;
                return hours;
            },
            findUnique: async ({ where }: { where: { id: string } }) =>
                hours.find((h) => h.id === where.id) ?? null,
            update: async ({ where, data }: { where: { id: string }; data: Partial<FakeHour> }) => {
                const hour = hours.find((h) => h.id === where.id)!;
                Object.assign(hour, data);
                return hour;
            },
        },
    };
    const bank = {
        syncLifetimeBank: async (userId: string) => {
            calls.syncedFor.push(userId);
        },
    };
    const service = new VolunteerHourCounterpartyService(prisma as never, bank as never);
    return { service, calls };
}

const dispute = (service: VolunteerHourCounterpartyService, userId: string, role: Role = Role.USER) =>
    service.disputeAutoVerifiedHour("h1", userId, role, {});

const cases: TestCase[] = [
    {
        name: "deadline helper adds the window; cutoff subtracts it",
        run: () => {
            const base = new Date("2026-01-10T00:00:00.000Z");
            assert.equal(
                getAutoVerifyDisputeDeadline(base, 14).toISOString(),
                "2026-01-24T00:00:00.000Z",
            );
            assert.equal(
                getAutoVerifyDisputeCutoff(base, 14).toISOString(),
                "2025-12-27T00:00:00.000Z",
            );
        },
    },
    {
        name: "list queries only my VERIFIED auto-verified mentorship hours inside the window",
        run: async () => {
            const { service, calls } = build([makeHour()]);
            await service.listDisputableHours(MENTEE);
            const where = calls.findManyWhere as {
                counterpartyUserId: string;
                source: VolunteerHourSource;
                verificationStatus: VolunteerHourVerificationStatus;
                autoVerifiedAt: { not: null; gte: Date };
            };
            assert.equal(where.counterpartyUserId, MENTEE);
            assert.equal(where.source, VolunteerHourSource.MENTORSHIP_CALL);
            assert.equal(where.verificationStatus, VolunteerHourVerificationStatus.VERIFIED);
            assert.equal(where.autoVerifiedAt.not, null);
            const expectedCutoff = Date.now() - WINDOW_DAYS * DAY_MS;
            assert.ok(Math.abs(where.autoVerifiedAt.gte.getTime() - expectedCutoff) < 5000);
        },
    },
    {
        name: "list rows expose the dispute deadline and window length",
        run: async () => {
            const verifiedAt = daysAgo(3);
            const { service } = build([makeHour({ autoVerifiedAt: verifiedAt })]);
            const [row] = await service.listDisputableHours(MENTEE);
            assert.equal(row.disputeWindowDays, WINDOW_DAYS);
            assert.equal(
                row.disputeDeadline.getTime(),
                verifiedAt.getTime() + WINDOW_DAYS * DAY_MS,
            );
        },
    },
    {
        name: "an id returned by the list is accepted by dispute, flips to REJECTED and re-syncs the mentor bank",
        run: async () => {
            const { service, calls } = build([makeHour()]);
            const [listed] = await service.listDisputableHours(MENTEE);
            const result = await service.disputeAutoVerifiedHour(listed.id, MENTEE, Role.USER, {});
            assert.equal(result.verificationStatus, VolunteerHourVerificationStatus.REJECTED);
            assert.equal(result.isVerified, false);
            assert.deepEqual(calls.syncedFor, [MENTOR]);
        },
    },
    {
        name: "dispute outside the window is a 400 for the mentee",
        run: async () => {
            const { service, calls } = build([makeHour({ autoVerifiedAt: daysAgo(WINDOW_DAYS + 1) })]);
            await assert.rejects(dispute(service, MENTEE), BadRequestException);
            assert.deepEqual(calls.syncedFor, []);
        },
    },
    {
        name: "dispute outside the window is still allowed for an admin",
        run: async () => {
            const { service } = build([makeHour({ autoVerifiedAt: daysAgo(WINDOW_DAYS + 1) })]);
            const result = await dispute(service, "admin-1", Role.ADMIN);
            assert.equal(result.verificationStatus, VolunteerHourVerificationStatus.REJECTED);
        },
    },
    {
        name: "someone else's hour is a 403, a missing hour is a 404",
        run: async () => {
            const { service } = build([makeHour()]);
            await assert.rejects(dispute(service, "stranger-1"), ForbiddenException);
            await assert.rejects(
                service.disputeAutoVerifiedHour("missing", MENTEE, Role.USER, {}),
                NotFoundException,
            );
        },
    },
    {
        name: "a PENDING (not auto-verified) hour is a 400",
        run: async () => {
            const { service } = build([
                makeHour({
                    verificationStatus: VolunteerHourVerificationStatus.PENDING,
                    autoVerifiedAt: null,
                }),
            ]);
            await assert.rejects(dispute(service, MENTEE), BadRequestException);
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
