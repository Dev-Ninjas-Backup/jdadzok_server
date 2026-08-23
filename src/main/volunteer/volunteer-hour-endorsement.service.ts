import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import {
    EndorseVolunteerHourDto,
    RejectVolunteerHourDto,
} from "./dto/endorse-volunteer-hour.dto";
import { isCapLevelHigher, isPlatformAdmin } from "@common/utils/cap-level.util";
import { VolunteerHourVerificationStatus } from "@prisma/client";

@Injectable()
export class VolunteerHourEndorsementService {
    constructor(private readonly prisma: PrismaService) {}

    async listMyHours(userId: string) {
        return this.prisma.volunteerHour.findMany({
            where: { loggedByUserId: userId },
            orderBy: { createdAt: "desc" },
            include: {
                application: {
                    select: {
                        id: true,
                        projectId: true,
                        project: { select: { id: true, title: true } },
                    },
                },
                endorsedByUser: {
                    select: {
                        id: true,
                        capLevel: true,
                        profile: { select: { name: true } },
                    },
                },
            },
        });
    }

    async listPendingForEndorsement(endorserUserId: string) {
        const endorser = await this.prisma.user.findUnique({
            where: { id: endorserUserId },
            select: { id: true, capLevel: true, role: true },
        });
        if (!endorser) {
            throw new NotFoundException("User not found");
        }

        const pending = await this.prisma.volunteerHour.findMany({
            where: {
                verificationStatus: VolunteerHourVerificationStatus.PENDING,
                source: "SELF_REPORT",
                loggedByUserId: { not: endorserUserId },
            },
            orderBy: { createdAt: "asc" },
            include: {
                loggedByUser: {
                    select: {
                        id: true,
                        capLevel: true,
                        profile: { select: { name: true } },
                    },
                },
                application: {
                    select: {
                        project: { select: { id: true, title: true } },
                    },
                },
            },
        });

        if (isPlatformAdmin(endorser.role)) {
            return pending;
        }

        return pending.filter((hour) =>
            isCapLevelHigher(endorser.capLevel, hour.loggedByUser.capLevel),
        );
    }

    async endorseHour(hourId: string, endorserUserId: string, dto: EndorseVolunteerHourDto) {
        const hour = await this.loadPendingSelfReportHour(hourId);
        await this.assertCanEndorse(endorserUserId, hour.loggedByUserId, hour.loggedByUser);

        const capCreditHours = Math.ceil(hour.hours);

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.volunteerHour.update({
                where: { id: hourId },
                data: {
                    verificationStatus: VolunteerHourVerificationStatus.VERIFIED,
                    isVerified: true,
                    endorsedByUserId: endorserUserId,
                    endorsedAt: new Date(),
                    rejectionNote: null,
                },
            });

            await tx.endorsement.create({
                data: {
                    fromUserId: endorserUserId,
                    toUserId: hour.loggedByUserId,
                    message:
                        dto.message?.trim() ||
                        "Endorsed self-reported volunteer hours for Cap credit.",
                    projectId: hour.application?.projectId ?? null,
                    volunteerHourId: hourId,
                },
            });

            await tx.userMetrics.updateMany({
                where: { userId: hour.loggedByUserId },
                data: { volunteerHours: { increment: capCreditHours } },
            });

            return updated;
        });
    }

    async rejectHour(hourId: string, endorserUserId: string, dto: RejectVolunteerHourDto) {
        const hour = await this.loadPendingSelfReportHour(hourId);
        await this.assertCanEndorse(endorserUserId, hour.loggedByUserId, hour.loggedByUser);

        return this.prisma.volunteerHour.update({
            where: { id: hourId },
            data: {
                verificationStatus: VolunteerHourVerificationStatus.REJECTED,
                isVerified: false,
                endorsedByUserId: endorserUserId,
                endorsedAt: new Date(),
                rejectionNote: dto.rejectionNote?.trim() || "Self-reported hours not endorsed.",
            },
        });
    }

    private async loadPendingSelfReportHour(hourId: string) {
        const hour = await this.prisma.volunteerHour.findUnique({
            where: { id: hourId },
            include: {
                loggedByUser: { select: { id: true, capLevel: true, role: true } },
                application: { select: { projectId: true } },
            },
        });

        if (!hour) {
            throw new NotFoundException("Volunteer hour entry not found");
        }

        if (hour.source !== "SELF_REPORT") {
            throw new BadRequestException(
                "Only self-reported hours require endorsement. Mentorship-call hours are auto-verified.",
            );
        }

        if (hour.verificationStatus !== VolunteerHourVerificationStatus.PENDING) {
            throw new BadRequestException(
                `Hour entry is already ${hour.verificationStatus.toLowerCase()}.`,
            );
        }

        return hour;
    }

    private async assertCanEndorse(
        endorserUserId: string,
        loggerUserId: string,
        logger: { capLevel: import("@prisma/client").CapLevel },
    ) {
        if (endorserUserId === loggerUserId) {
            throw new ForbiddenException("You cannot endorse your own volunteer hours.");
        }

        const endorser = await this.prisma.user.findUnique({
            where: { id: endorserUserId },
            select: { capLevel: true, role: true },
        });
        if (!endorser) {
            throw new NotFoundException("Endorser not found");
        }

        if (isPlatformAdmin(endorser.role)) {
            return;
        }

        if (!isCapLevelHigher(endorser.capLevel, logger.capLevel)) {
            throw new ForbiddenException(
                "Endorsement requires a higher Cap level than the volunteer who logged the hours, or platform admin access.",
            );
        }
    }
}
