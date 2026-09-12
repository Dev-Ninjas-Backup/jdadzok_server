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
import { ListCounterpartyUsersDto } from "./dto/list-counterparty-users.dto";
import {
    counterpartyConfirmationComplete,
    requiresCounterpartyConfirmation,
} from "@common/utils/volunteer-hour.util";
import { Prisma, Role, VolunteerHourSource, VolunteerHourVerificationStatus } from "@prisma/client";
import { VolunteerHoursBankService } from "./volunteer-hours-bank.service";
import { MENTORSHIP_AUTO_VERIFY_DISPUTE_WINDOW_DAYS } from "@module/(shared)/calling/mentorship-auto-verify.constants";

@Injectable()
export class VolunteerHourCounterpartyService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly hoursBankService: VolunteerHoursBankService,
    ) {}

    async listCandidateUsers(currentUserId: string, dto: ListCounterpartyUsersDto) {
        const page = dto.page ?? 1;
        const limit = dto.limit ?? 20;
        const q = dto.q?.trim();

        const where: Prisma.UserWhereInput = {
            id: { not: currentUserId },
            profile: q
                ? {
                      OR: [
                          { name: { contains: q, mode: "insensitive" } },
                          { username: { contains: q, mode: "insensitive" } },
                      ],
                  }
                : { isNot: null },
        };

        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                select: {
                    id: true,
                    profile: { select: { name: true, username: true, avatarUrl: true } },
                },
                orderBy: { profile: { name: "asc" } },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.user.count({ where }),
        ]);

        return {
            page,
            limit,
            total,
            users: users
                .filter((u) => u.profile)
                .map((u) => ({
                    id: u.id,
                    name: u.profile!.name,
                    username: u.profile!.username,
                    avatarUrl: u.profile!.avatarUrl,
                })),
        };
    }

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

    async confirmHour(hourId: string, counterpartyUserId: string, dto: ConfirmCounterpartyHourDto) {
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

    /**
     * Clawback path for an already auto-verified mentorship hour (see MentorshipCallHoursService).
     * Distinct from rejectHour because the preconditions and consequences differ: the hour is
     * already VERIFIED and already counted in the mentor's lifetime bank, so reversing it means
     * flipping status to REJECTED and re-syncing the bank, not just declining a pending request.
     */
    async disputeAutoVerifiedHour(
        hourId: string,
        requestingUserId: string,
        requestingUserRole: Role,
        dto: RejectCounterpartyHourDto,
    ) {
        const hour = await this.prisma.volunteerHour.findUnique({ where: { id: hourId } });
        if (!hour) {
            throw new NotFoundException("Volunteer hour entry not found");
        }

        const isAdmin = requestingUserRole === Role.ADMIN || requestingUserRole === Role.SUPER_ADMIN;
        if (!isAdmin && hour.counterpartyUserId !== requestingUserId) {
            throw new ForbiddenException(
                "Only the mentee on this session or an admin can dispute it.",
            );
        }

        if (
            hour.source !== VolunteerHourSource.MENTORSHIP_CALL ||
            hour.verificationStatus !== VolunteerHourVerificationStatus.VERIFIED ||
            !hour.autoVerifiedAt
        ) {
            throw new BadRequestException("This hour entry was not auto-verified.");
        }

        const disputeDeadline = new Date(hour.autoVerifiedAt);
        disputeDeadline.setDate(
            disputeDeadline.getDate() + MENTORSHIP_AUTO_VERIFY_DISPUTE_WINDOW_DAYS,
        );
        if (!isAdmin && new Date() > disputeDeadline) {
            throw new BadRequestException(
                `The ${MENTORSHIP_AUTO_VERIFY_DISPUTE_WINDOW_DAYS}-day dispute window for this session has closed.`,
            );
        }

        const updated = await this.prisma.volunteerHour.update({
            where: { id: hourId },
            data: {
                verificationStatus: VolunteerHourVerificationStatus.REJECTED,
                isVerified: false,
                rejectionNote:
                    dto.rejectionNote?.trim() ||
                    "Auto-verified session disputed by mentee/admin and reversed.",
            },
        });

        await this.hoursBankService.syncLifetimeBank(hour.loggedByUserId);

        return updated;
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

        if (!hour.contributionType || !requiresCounterpartyConfirmation(hour.contributionType)) {
            throw new BadRequestException(
                "This hour entry does not require counterparty confirmation.",
            );
        }

        return hour;
    }
}
