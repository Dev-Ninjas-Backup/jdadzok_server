import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable, Logger } from "@nestjs/common";
import {
    ApplicationStatus,
    CallPurpose,
    CallStatus,
    ContributionType,
    VolunteerHourSource,
    VolunteerHourVerificationStatus,
} from "@prisma/client";

@Injectable()
export class MentorshipCallHoursService {
    private readonly logger = new Logger(MentorshipCallHoursService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * After a MENTORSHIP call ends, create a pending VolunteerHour from duration.
     * Cap credit applies only after the mentee (counterparty) confirms the session.
     */
    async maybeLogVerifiedHoursFromCall(callId: string): Promise<void> {
        try {
            const call = await this.prisma.calling.findUnique({
                where: { id: callId },
                include: {
                    host: {
                        include: {
                            profile: { select: { isVolunteerMentorOptIn: true } },
                        },
                    },
                    recipient: {
                        include: {
                            profile: { select: { isVolunteerMentorOptIn: true } },
                        },
                    },
                    volunteerHour: { select: { id: true } },
                },
            });

            if (!call) {
                return;
            }

            if (call.callPurpose !== CallPurpose.MENTORSHIP) {
                return;
            }

            if (call.status !== CallStatus.END) {
                return;
            }

            if (!call.startedAt || !call.endedAt) {
                return;
            }

            if (call.volunteerHour) {
                this.logger.debug(`VolunteerHour already exists for call ${callId}`);
                return;
            }

            const mentorUserId = this.resolveMentorUserId(call);
            if (!mentorUserId) {
                this.logger.warn(
                    `Skipping mentorship hour log for call ${callId}: no opted-in mentor`,
                );
                return;
            }

            const durationMs = call.endedAt.getTime() - call.startedAt.getTime();
            if (durationMs <= 0) {
                return;
            }

            // Hours to 2 decimal places (e.g. 45 min → 0.75)
            const hours = Math.round((durationMs / (1000 * 60 * 60)) * 100) / 100;
            if (hours <= 0) {
                return;
            }

            const acceptedApp = await this.prisma.volunteerApplication.findFirst({
                where: {
                    volunteerId: mentorUserId,
                    status: ApplicationStatus.ACCEPTED,
                },
                orderBy: { updatedAt: "desc" },
            });

            await this.prisma.$transaction(async (tx) => {
                const menteeUserId = this.resolveMenteeUserId(call, mentorUserId);
                if (!menteeUserId) {
                    this.logger.warn(
                        `Skipping mentorship hour log for call ${callId}: no counterparty mentee`,
                    );
                    return;
                }

                await tx.volunteerHour.create({
                    data: {
                        callId: call.id,
                        applicationId: acceptedApp?.id ?? null,
                        loggedByUserId: mentorUserId,
                        counterpartyUserId: menteeUserId,
                        hours,
                        isVerified: false,
                        verificationStatus: VolunteerHourVerificationStatus.PENDING,
                        source: VolunteerHourSource.MENTORSHIP_CALL,
                        contributionType: ContributionType.MENTORING,
                        contributionOther: null,
                        note: `Mentorship call ${call.id} (${call.startedAt!.toISOString()} → ${call.endedAt!.toISOString()}) — awaiting mentee confirmation`,
                    },
                });

                if (acceptedApp) {
                    await tx.volunteerApplication.update({
                        where: { id: acceptedApp.id },
                        data: { workedHours: { increment: Math.ceil(hours) } },
                    });
                }
            });

            this.logger.log(
                `Mentorship VolunteerHour logged (pending mentee confirmation) for call ${callId}: ${hours}h → mentor ${mentorUserId}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to log mentorship VolunteerHour for call ${callId}: ${
                    error instanceof Error ? error.message : error
                }`,
            );
        }
    }

    private resolveMentorUserId(call: {
        hostUserId: string;
        recipientUserId: string | null;
        host: { profile: { isVolunteerMentorOptIn: boolean } | null };
        recipient: { profile: { isVolunteerMentorOptIn: boolean } | null } | null;
    }): string | null {
        if (call.host.profile?.isVolunteerMentorOptIn) {
            return call.hostUserId;
        }
        if (call.recipientUserId && call.recipient?.profile?.isVolunteerMentorOptIn) {
            return call.recipientUserId;
        }
        return null;
    }

    private resolveMenteeUserId(
        call: {
            hostUserId: string;
            recipientUserId: string | null;
        },
        mentorUserId: string,
    ): string | null {
        if (call.hostUserId === mentorUserId) {
            return call.recipientUserId;
        }
        if (call.recipientUserId === mentorUserId) {
            return call.hostUserId;
        }
        return call.recipientUserId ?? null;
    }
}
