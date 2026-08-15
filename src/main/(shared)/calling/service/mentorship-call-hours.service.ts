import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable, Logger } from "@nestjs/common";
import { ApplicationStatus, CallPurpose, CallStatus } from "@prisma/client";

@Injectable()
export class MentorshipCallHoursService {
    private readonly logger = new Logger(MentorshipCallHoursService.name);

    constructor(private readonly prisma: PrismaService) {}

    /**
     * After a MENTORSHIP call ends, auto-create a verified VolunteerHour from duration.
     * Credits the opted-in mentor (host preferred, else recipient). Links ACCEPTED application when found.
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
                await tx.volunteerHour.create({
                    data: {
                        callId: call.id,
                        applicationId: acceptedApp?.id ?? null,
                        loggedByUserId: mentorUserId,
                        hours,
                        isVerified: true,
                        note: `Verified mentorship call ${call.id} (${call.startedAt!.toISOString()} → ${call.endedAt!.toISOString()})`,
                    },
                });

                if (acceptedApp) {
                    await tx.volunteerApplication.update({
                        where: { id: acceptedApp.id },
                        data: { workedHours: { increment: Math.ceil(hours) } },
                    });
                }

                await tx.userMetrics.updateMany({
                    where: { userId: mentorUserId },
                    data: { volunteerHours: { increment: Math.ceil(hours) } },
                });
            });

            this.logger.log(
                `Verified VolunteerHour logged for mentorship call ${callId}: ${hours}h → user ${mentorUserId}`,
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
}
