import { PrismaService } from "@lib/prisma/prisma.service";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { CallPurpose, CallStatus } from "@prisma/client";
import { FriendRequestService } from "@module/(users)/friend-request/friend-request.service";
import { MentorshipCallHoursService } from "../calling/service/mentorship-call-hours.service";

@Injectable()
export class RealTimeCallService {
    constructor(
        private prisma: PrismaService,
        private readonly mentorshipCallHours: MentorshipCallHoursService,
        private readonly friendRequestService: FriendRequestService,
    ) {}

    async createCall(
        hostUserId: string,
        recipientUserId: string,
        title?: string,
        callPurpose: CallPurpose = CallPurpose.GENERAL,
    ) {
        if (callPurpose === CallPurpose.GENERAL) {
            await this.friendRequestService.assertConnected(hostUserId, recipientUserId);
        }

        if (callPurpose === CallPurpose.MENTORSHIP) {
            const hostProfile = await this.prisma.profile.findFirst({
                where: { userId: hostUserId },
                select: { isVolunteerMentorOptIn: true },
            });
            if (!hostProfile?.isVolunteerMentorOptIn) {
                throw new ForbiddenException(
                    "Volunteer / mentor opt-in is required to start a mentorship call",
                );
            }
        }

        return this.prisma.calling.create({
            data: {
                hostUserId,
                recipientUserId,
                title,
                callPurpose,
            },
        });
    }

    async markRinging(callId: string) {
        return this.prisma.calling.update({
            where: { id: callId },
            data: { status: CallStatus.RINING },
        });
    }

    async markActive(callId: string) {
        return this.prisma.calling.update({
            where: { id: callId },
            data: { status: CallStatus.ACTIVE, startedAt: new Date() },
        });
    }

    async markDeclined(callId: string) {
        return this.prisma.calling.update({
            where: { id: callId },
            data: { status: CallStatus.DECLINED, endedAt: new Date() },
        });
    }

    async markMissed(callId: string) {
        return this.prisma.calling.update({
            where: { id: callId },
            data: { status: CallStatus.MISSED, endedAt: new Date() },
        });
    }

    async endCall(callId: string) {
        const call = await this.prisma.calling.update({
            where: { id: callId },
            data: { status: CallStatus.END, endedAt: new Date() },
        });
        await this.mentorshipCallHours.maybeLogVerifiedHoursFromCall(callId);
        return call;
    }

    async getCallStatus(callId: string) {
        const call = await this.prisma.calling.findUnique({
            where: { id: callId },
            select: {
                id: true,
                status: true,
                callPurpose: true,
                startedAt: true,
                endedAt: true,
                hostUserId: true,
                recipientUserId: true,
                title: true,
            },
        });

        if (!call) {
            throw new Error("Call not found");
        }

        return call;
    }
}
