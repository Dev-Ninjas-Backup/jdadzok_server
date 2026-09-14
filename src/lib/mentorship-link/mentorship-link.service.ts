import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { ApplicationStatus, BridgeBookingStatus, ContributionType } from "@prisma/client";

export type MentorshipLink =
    | { kind: "VOLUNTEER_APPLICATION"; id: string; mentorUserId: string; menteeUserId: string }
    | { kind: "BRIDGE_BOOKING"; id: string; mentorUserId: string; menteeUserId: string };

/**
 * Source of truth for "do these two users have an accepted mentorship relationship":
 * an accepted volunteer application (mentor = volunteer, mentee proxy = project owner)
 * or an accepted Bridge mentoring/advice booking (mentor = provider, mentee = client).
 */
@Injectable()
export class MentorshipLinkService {
    constructor(private readonly prisma: PrismaService) {}

    async findLink(userA: string, userB: string): Promise<MentorshipLink | null> {
        const volunteerLink = await this.prisma.volunteerApplication.findFirst({
            where: {
                status: ApplicationStatus.ACCEPTED,
                OR: [
                    { volunteerId: userA, project: { createdById: userB } },
                    { volunteerId: userB, project: { createdById: userA } },
                ],
            },
            select: { id: true, volunteerId: true, project: { select: { createdById: true } } },
        });

        if (volunteerLink) {
            return {
                kind: "VOLUNTEER_APPLICATION",
                id: volunteerLink.id,
                mentorUserId: volunteerLink.volunteerId,
                menteeUserId: volunteerLink.project.createdById,
            };
        }

        const bridgeLink = await this.prisma.bridgeBooking.findFirst({
            where: {
                status: BridgeBookingStatus.ACCEPTED,
                OR: [
                    { clientId: userA, providerId: userB },
                    { clientId: userB, providerId: userA },
                ],
                listing: {
                    OR: [
                        { type: "EXPERTISE" },
                        { contributionType: ContributionType.MENTORING },
                        { contributionType: ContributionType.ADVICE },
                    ],
                },
            },
            select: { id: true, providerId: true, clientId: true },
        });

        if (bridgeLink) {
            return {
                kind: "BRIDGE_BOOKING",
                id: bridgeLink.id,
                mentorUserId: bridgeLink.providerId,
                menteeUserId: bridgeLink.clientId,
            };
        }

        return null;
    }
}
