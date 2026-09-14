import { PrismaService } from "@lib/prisma/prisma.service";
import { MentorshipLinkService } from "@lib/mentorship-link/mentorship-link.service";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    CallPurpose,
    CallStatus,
    ContributionType,
    VolunteerHourSource,
    VolunteerHourVerificationStatus,
} from "@prisma/client";
import { VolunteerHoursBankService } from "@module/volunteer/volunteer-hours-bank.service";
import {
    DEFAULT_MENTORSHIP_MAX_DAILY_HOURS_PER_MENTOR,
    DEFAULT_MENTORSHIP_MAX_DAILY_HOURS_PER_PAIR,
    DEFAULT_MENTORSHIP_MAX_HOURS_PER_CALL,
    DEFAULT_MENTORSHIP_MIN_DURATION_MINUTES,
} from "../mentorship-auto-verify.constants";

@Injectable()
export class MentorshipCallHoursService {
    private readonly logger = new Logger(MentorshipCallHoursService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly mentorshipLinkService: MentorshipLinkService,
        private readonly hoursBankService: VolunteerHoursBankService,
        private readonly config: ConfigService,
    ) {}

    /**
     * After a MENTORSHIP call ends, auto-verify server-witnessed sessions that pass the
     * relationship / presence / duration / rate-limit checks below; everything else still
     * creates an auditable VolunteerHour record (PENDING for mentee confirmation, or
     * REJECTED when the call isn't a real mentorship pairing at all).
     */
    async maybeLogVerifiedHoursFromCall(callId: string): Promise<void> {
        try {
            const call = await this.prisma.calling.findUnique({
                where: { id: callId },
                include: { volunteerHour: { select: { id: true } } },
            });

            if (!call) return;
            if (call.callPurpose !== CallPurpose.MENTORSHIP) return;
            if (call.status !== CallStatus.END) return;
            if (!call.startedAt || !call.endedAt) return;
            if (!call.recipientUserId) return;

            if (call.volunteerHour) {
                this.logger.debug(`VolunteerHour already exists for call ${callId}`);
                return;
            }

            const durationMs = call.endedAt.getTime() - call.startedAt.getTime();
            if (durationMs <= 0) return;

            // 1. Relationship check — source of truth for both legitimacy and mentor/mentee identity.
            // callPurpose is client-supplied, so this is what actually stops a modified client from
            // minting a "mentorship" session between two unrelated users.
            const link = await this.mentorshipLinkService.findLink(
                call.hostUserId,
                call.recipientUserId,
            );

            if (!link) {
                await this.prisma.volunteerHour.create({
                    data: {
                        callId: call.id,
                        loggedByUserId: call.hostUserId,
                        counterpartyUserId: call.recipientUserId,
                        hours: 0,
                        isVerified: false,
                        verificationStatus: VolunteerHourVerificationStatus.REJECTED,
                        source: VolunteerHourSource.MENTORSHIP_CALL,
                        contributionType: ContributionType.MENTORING,
                        rejectionNote:
                            "Auto-rejected: no accepted mentorship relationship found between these users.",
                        note: `Mentorship call ${call.id} (${call.startedAt.toISOString()} → ${call.endedAt.toISOString()})`,
                    },
                });
                this.logger.warn(
                    `Auto-rejected mentorship hour for call ${callId}: no relationship between ${call.hostUserId} and ${call.recipientUserId}`,
                );
                return;
            }

            const { mentorUserId, menteeUserId } = link;
            const applicationId = link.kind === "VOLUNTEER_APPLICATION" ? link.id : null;

            // 2. Presence, not wall clock — credit the overlapping connected interval.
            const overlapMinutes = await this.computeOverlapMinutes(
                call.id,
                mentorUserId,
                menteeUserId,
                call.endedAt,
            );

            if (overlapMinutes === null) {
                await this.createPendingFallback(call.id, call.startedAt, call.endedAt, {
                    mentorUserId,
                    menteeUserId,
                    applicationId,
                    hours: Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100,
                    reason: "Presence data unavailable for this call — awaiting mentee confirmation",
                });
                return;
            }

            const rawHours = Math.round((overlapMinutes / 60) * 100) / 100;
            if (rawHours <= 0) return;

            // 3. Minimum duration floor.
            if (overlapMinutes < this.minDurationMinutes()) {
                await this.createPendingFallback(call.id, call.startedAt, call.endedAt, {
                    mentorUserId,
                    menteeUserId,
                    applicationId,
                    hours: rawHours,
                    reason: `Session below the ${this.minDurationMinutes()}-minute auto-verify floor — awaiting mentee confirmation`,
                });
                return;
            }

            // 4. Rate limits — per-mentor/day, per-pair/day, per-call ceiling. Clamp rather than
            // reject outright when partial allowance remains; only fall back when it's fully spent.
            const remaining = await this.remainingAutoVerifyAllowance(mentorUserId, menteeUserId);
            if (remaining <= 0) {
                await this.createPendingFallback(call.id, call.startedAt, call.endedAt, {
                    mentorUserId,
                    menteeUserId,
                    applicationId,
                    hours: rawHours,
                    reason: "Daily auto-verify cap reached for this mentor/pair — awaiting mentee confirmation",
                });
                return;
            }

            const creditedHours = Math.min(rawHours, remaining, this.maxHoursPerCall());
            const roundedHours = Math.round(creditedHours * 100) / 100;
            const now = new Date();

            await this.prisma.$transaction(async (tx) => {
                await tx.volunteerHour.create({
                    data: {
                        callId: call.id,
                        applicationId,
                        loggedByUserId: mentorUserId,
                        counterpartyUserId: menteeUserId,
                        hours: roundedHours,
                        isVerified: true,
                        verificationStatus: VolunteerHourVerificationStatus.VERIFIED,
                        source: VolunteerHourSource.MENTORSHIP_CALL,
                        contributionType: ContributionType.MENTORING,
                        counterpartyConfirmedAt: now,
                        counterpartyConfirmationNote: "Auto-verified: server-witnessed session",
                        autoVerifiedAt: now,
                        note: `Mentorship call ${call.id} (${call.startedAt!.toISOString()} → ${call.endedAt!.toISOString()}) — auto-verified`,
                    },
                });

                if (applicationId) {
                    await tx.volunteerApplication.update({
                        where: { id: applicationId },
                        data: { workedHours: { increment: Math.ceil(roundedHours) } },
                    });
                }
            });

            await this.hoursBankService.syncLifetimeBank(mentorUserId);

            this.logger.log(
                `Mentorship VolunteerHour auto-verified for call ${callId}: ${roundedHours}h → mentor ${mentorUserId}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to log mentorship VolunteerHour for call ${callId}: ${
                    error instanceof Error ? error.message : error
                }`,
            );
        }
    }

    private async createPendingFallback(
        callId: string,
        startedAt: Date,
        endedAt: Date,
        params: {
            mentorUserId: string;
            menteeUserId: string;
            applicationId: string | null;
            hours: number;
            reason: string;
        },
    ) {
        await this.prisma.$transaction(async (tx) => {
            await tx.volunteerHour.create({
                data: {
                    callId,
                    applicationId: params.applicationId,
                    loggedByUserId: params.mentorUserId,
                    counterpartyUserId: params.menteeUserId,
                    hours: params.hours,
                    isVerified: false,
                    verificationStatus: VolunteerHourVerificationStatus.PENDING,
                    source: VolunteerHourSource.MENTORSHIP_CALL,
                    contributionType: ContributionType.MENTORING,
                    note: `Mentorship call ${callId} (${startedAt.toISOString()} → ${endedAt.toISOString()}) — ${params.reason}`,
                },
            });

            if (params.applicationId) {
                await tx.volunteerApplication.update({
                    where: { id: params.applicationId },
                    data: { workedHours: { increment: Math.ceil(params.hours) } },
                });
            }
        });

        this.logger.log(
            `Mentorship VolunteerHour logged (pending mentee confirmation) for call ${callId}: ${params.reason}`,
        );
    }

    /** Sums overlapping connected intervals between the two users for this call, in minutes. Null = no presence data. */
    private async computeOverlapMinutes(
        callId: string,
        userA: string,
        userB: string,
        callEndedAt: Date,
    ): Promise<number | null> {
        const rows = await this.prisma.callParticipant.findMany({
            where: { callId, userId: { in: [userA, userB] } },
            select: { userId: true, joinedAt: true, leftAt: true },
        });

        const intervalsFor = (userId: string) =>
            rows
                .filter((r) => r.userId === userId)
                .map((r) => ({ start: r.joinedAt, end: r.leftAt ?? callEndedAt }));

        const aIntervals = intervalsFor(userA);
        const bIntervals = intervalsFor(userB);
        if (!aIntervals.length || !bIntervals.length) {
            return null;
        }

        let overlapMs = 0;
        for (const a of aIntervals) {
            for (const b of bIntervals) {
                const start = Math.max(a.start.getTime(), b.start.getTime());
                const end = Math.min(a.end.getTime(), b.end.getTime());
                if (end > start) {
                    overlapMs += end - start;
                }
            }
        }

        return overlapMs / (1000 * 60);
    }

    /** Remaining hours creditable today under the per-mentor and per-pair daily caps (min of both). */
    private async remainingAutoVerifyAllowance(
        mentorUserId: string,
        menteeUserId: string,
    ): Promise<number> {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        const verifiedToday = {
            source: VolunteerHourSource.MENTORSHIP_CALL,
            verificationStatus: VolunteerHourVerificationStatus.VERIFIED,
            createdAt: { gte: startOfDay },
        } as const;

        const [mentorTotal, pairTotal] = await Promise.all([
            this.prisma.volunteerHour.aggregate({
                where: { ...verifiedToday, loggedByUserId: mentorUserId },
                _sum: { hours: true },
            }),
            this.prisma.volunteerHour.aggregate({
                where: { ...verifiedToday, loggedByUserId: mentorUserId, counterpartyUserId: menteeUserId },
                _sum: { hours: true },
            }),
        ]);

        const mentorRemaining = this.maxDailyHoursPerMentor() - (mentorTotal._sum.hours ?? 0);
        const pairRemaining = this.maxDailyHoursPerPair() - (pairTotal._sum.hours ?? 0);

        return Math.max(0, Math.min(mentorRemaining, pairRemaining));
    }

    private minDurationMinutes(): number {
        const raw = Number(this.config.get<string>("MENTORSHIP_MIN_DURATION_MINUTES"));
        return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MENTORSHIP_MIN_DURATION_MINUTES;
    }

    private maxDailyHoursPerMentor(): number {
        const raw = Number(this.config.get<string>("MENTORSHIP_MAX_DAILY_HOURS_PER_MENTOR"));
        return Number.isFinite(raw) && raw > 0
            ? raw
            : DEFAULT_MENTORSHIP_MAX_DAILY_HOURS_PER_MENTOR;
    }

    private maxDailyHoursPerPair(): number {
        const raw = Number(this.config.get<string>("MENTORSHIP_MAX_DAILY_HOURS_PER_PAIR"));
        return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MENTORSHIP_MAX_DAILY_HOURS_PER_PAIR;
    }

    private maxHoursPerCall(): number {
        const raw = Number(this.config.get<string>("MENTORSHIP_MAX_HOURS_PER_CALL"));
        return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MENTORSHIP_MAX_HOURS_PER_CALL;
    }
}
