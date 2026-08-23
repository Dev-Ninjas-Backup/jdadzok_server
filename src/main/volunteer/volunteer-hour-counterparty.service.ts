import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import {
    ConfirmCounterpartyHourDto,
    RejectCounterpartyHourDto,
} from "./dto/counterparty-volunteer-hour.dto";
import {
    counterpartyConfirmationComplete,
    requiresCounterpartyConfirmation,
} from "@common/utils/volunteer-hour.util";
import {
    VolunteerHourSource,
    VolunteerHourVerificationStatus,
} from "@prisma/client";
import { VolunteerHoursBankService } from "./volunteer-hours-bank.service";

@Injectable()
export class VolunteerHourCounterpartyService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly hoursBankService: VolunteerHoursBankService,
    ) {}

    async listPendingCounterpartyConfirmation(counterpartyUserId: string) {
        return this.prisma.volunteerHour.findMany({
            where: {
                counterpartyUserId,
                counterpartyConfirmedAt: null,
                verificationStatus: VolunteerHourVerificationStatus.PENDING,
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
                call: {
                    select: {
                        id: true,
                        callPurpose: true,
                        startedAt: true,
                        endedAt: true,
                    },
                },
                application: {
                    select: {
                        project: { select: { id: true, title: true } },
                    },
                },
            },
        });
    }

    async confirmHour(
        hourId: string,
        counterpartyUserId: string,
        dto: ConfirmCounterpartyHourDto,
    ) {
        const hour = await this.loadAwaitingCounterpartyHour(hourId, counterpartyUserId);

        const now = new Date();

        if (hour.source === VolunteerHourSource.MENTORSHIP_CALL) {
            const updated = await this.prisma.volunteerHour.update({
                where: { id: hourId },
                data: {
                    counterpartyConfirmedAt: now,
                    counterpartyConfirmationNote: dto.confirmationNote?.trim() || null,
                    verificationStatus: VolunteerHourVerificationStatus.VERIFIED,
                    isVerified: true,
                },
            });

            await this.hoursBankService.syncLifetimeBank(hour.loggedByUserId);
            return updated;
        }

        return this.prisma.volunteerHour.update({
            where: { id: hourId },
            data: {
                counterpartyConfirmedAt: now,
                counterpartyConfirmationNote: dto.confirmationNote?.trim() || null,
            },
        });
    }

    async rejectHour(hourId: string, counterpartyUserId: string, dto: RejectCounterpartyHourDto) {
        await this.loadAwaitingCounterpartyHour(hourId, counterpartyUserId);

        return this.prisma.volunteerHour.update({
            where: { id: hourId },
            data: {
                verificationStatus: VolunteerHourVerificationStatus.REJECTED,
                isVerified: false,
                rejectionNote:
                    dto.rejectionNote?.trim() ||
                    "Mentee / recipient did not confirm this mentoring session.",
            },
        });
    }

    private async loadAwaitingCounterpartyHour(hourId: string, counterpartyUserId: string) {
        const hour = await this.prisma.volunteerHour.findUnique({
            where: { id: hourId },
            include: {
                loggedByUser: { select: { id: true } },
            },
        });

        if (!hour) {
            throw new NotFoundException("Volunteer hour entry not found");
        }

        if (hour.counterpartyUserId !== counterpartyUserId) {
            throw new ForbiddenException(
                "Only the designated mentee / recipient can confirm or reject this session.",
            );
        }

        if (hour.counterpartyConfirmedAt) {
            throw new BadRequestException("This session has already been confirmed.");
        }

        if (hour.verificationStatus !== VolunteerHourVerificationStatus.PENDING) {
            throw new BadRequestException(
                `Hour entry is already ${hour.verificationStatus.toLowerCase()}.`,
            );
        }

        if (
            !hour.contributionType ||
            !requiresCounterpartyConfirmation(hour.contributionType)
        ) {
            throw new BadRequestException(
                "This hour entry does not require counterparty confirmation.",
            );
        }

        return hour;
    }
}
