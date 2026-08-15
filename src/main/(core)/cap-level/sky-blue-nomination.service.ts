import { PrismaService } from "@lib/prisma/prisma.service";
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { CapLevel, SkyBlueNominationStatus } from "@prisma/client";
import {
    NominateSkyBlueDto,
    SkyBlueDecisionDto,
    SkyBlueVerificationDto,
} from "./dto/sky-blue-nomination.dto";

@Injectable()
export class SkyBlueNominationService {
    constructor(private readonly prisma: PrismaService) {}

    async nominate(actorId: string, dto: NominateSkyBlueDto) {
        if (actorId === dto.nomineeId) {
            throw new BadRequestException("You cannot nominate yourself for Sky Blue");
        }

        const nominee = await this.prisma.user.findUnique({ where: { id: dto.nomineeId } });
        if (!nominee) {
            throw new NotFoundException("Nominee user not found");
        }

        if (nominee.capLevel === CapLevel.SKY_BLUE) {
            throw new BadRequestException("User already holds Sky Blue");
        }

        const open = await this.prisma.skyBlueNomination.findFirst({
            where: {
                nomineeId: dto.nomineeId,
                status: {
                    in: [
                        SkyBlueNominationStatus.PENDING,
                        SkyBlueNominationStatus.IN_REVIEW,
                    ],
                },
            },
        });
        if (open) {
            throw new BadRequestException("An open Sky Blue nomination already exists for this user");
        }

        return this.prisma.$transaction(async (tx) => {
            const nomination = await tx.skyBlueNomination.create({
                data: {
                    nomineeId: dto.nomineeId,
                    nominatedById: actorId,
                    status: SkyBlueNominationStatus.PENDING,
                    decisionNotes: dto.notes,
                },
                include: this.defaultInclude(),
            });

            await tx.skyBlueNominationEvent.create({
                data: {
                    nominationId: nomination.id,
                    actorId,
                    action: "NOMINATED",
                    detail: dto.notes ?? "Invited to Sky Blue parallel track",
                },
            });

            return nomination;
        });
    }

    async verifyKyc(nominationId: string, actorId: string, dto: SkyBlueVerificationDto) {
        const nomination = await this.getOpenNomination(nominationId);

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.skyBlueNomination.update({
                where: { id: nomination.id },
                data: {
                    kycVerified: true,
                    kycVerifiedAt: new Date(),
                    kycVerifiedById: actorId,
                    kycNotes: dto.notes,
                    status: SkyBlueNominationStatus.IN_REVIEW,
                },
                include: this.defaultInclude(),
            });

            await tx.skyBlueNominationEvent.create({
                data: {
                    nominationId: nomination.id,
                    actorId,
                    action: "KYC_VERIFIED",
                    detail: dto.notes ?? "KYC verification recorded",
                },
            });

            return updated;
        });
    }

    async verifyNotability(nominationId: string, actorId: string, dto: SkyBlueVerificationDto) {
        const nomination = await this.getOpenNomination(nominationId);

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.skyBlueNomination.update({
                where: { id: nomination.id },
                data: {
                    notabilityVerified: true,
                    notabilityVerifiedAt: new Date(),
                    notabilityVerifiedById: actorId,
                    notabilityNotes: dto.notes,
                    status: SkyBlueNominationStatus.IN_REVIEW,
                },
                include: this.defaultInclude(),
            });

            await tx.skyBlueNominationEvent.create({
                data: {
                    nominationId: nomination.id,
                    actorId,
                    action: "NOTABILITY_VERIFIED",
                    detail: dto.notes ?? "Notability verification recorded",
                },
            });

            return updated;
        });
    }

    async approve(nominationId: string, actorId: string, dto: SkyBlueDecisionDto) {
        const nomination = await this.getOpenNomination(nominationId);

        if (!nomination.kycVerified || !nomination.notabilityVerified) {
            throw new BadRequestException(
                "Both KYC and notability must be verified before approving Sky Blue",
            );
        }

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.skyBlueNomination.update({
                where: { id: nomination.id },
                data: {
                    status: SkyBlueNominationStatus.APPROVED,
                    decidedAt: new Date(),
                    decidedById: actorId,
                    decisionNotes: dto.notes,
                },
                include: this.defaultInclude(),
            });

            await tx.user.update({
                where: { id: nomination.nomineeId },
                data: { capLevel: CapLevel.SKY_BLUE },
            });

            await tx.skyBlueNominationEvent.create({
                data: {
                    nominationId: nomination.id,
                    actorId,
                    action: "APPROVED",
                    detail:
                        dto.notes ??
                        "Sky Blue granted. Earns at Red ad-share until Black-level volunteering.",
                },
            });

            await tx.notification.create({
                data: {
                    userId: nomination.nomineeId,
                    type: "SYSTEM",
                    title: "Sky Blue Cap granted",
                    message:
                        "You have been invited onto Sky Blue. You earn at the Red ad-share rate until you complete Black-level volunteering hours.",
                },
            });

            return updated;
        });
    }

    async reject(nominationId: string, actorId: string, dto: SkyBlueDecisionDto) {
        const nomination = await this.getOpenNomination(nominationId);

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.skyBlueNomination.update({
                where: { id: nomination.id },
                data: {
                    status: SkyBlueNominationStatus.REJECTED,
                    decidedAt: new Date(),
                    decidedById: actorId,
                    decisionNotes: dto.notes,
                },
                include: this.defaultInclude(),
            });

            await tx.skyBlueNominationEvent.create({
                data: {
                    nominationId: nomination.id,
                    actorId,
                    action: "REJECTED",
                    detail: dto.notes ?? "Sky Blue nomination rejected",
                },
            });

            return updated;
        });
    }

    async revoke(nominationId: string, actorId: string, dto: SkyBlueDecisionDto) {
        const nomination = await this.prisma.skyBlueNomination.findUnique({
            where: { id: nominationId },
        });
        if (!nomination) {
            throw new NotFoundException("Nomination not found");
        }
        if (nomination.status !== SkyBlueNominationStatus.APPROVED) {
            throw new BadRequestException("Only an approved Sky Blue nomination can be revoked");
        }

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.skyBlueNomination.update({
                where: { id: nomination.id },
                data: {
                    status: SkyBlueNominationStatus.REVOKED,
                    decidedAt: new Date(),
                    decidedById: actorId,
                    decisionNotes: dto.notes,
                },
                include: this.defaultInclude(),
            });

            // Demote to BLACK if they still hold Sky Blue (parallel track removal)
            const user = await tx.user.findUnique({ where: { id: nomination.nomineeId } });
            if (user?.capLevel === CapLevel.SKY_BLUE) {
                await tx.user.update({
                    where: { id: nomination.nomineeId },
                    data: { capLevel: CapLevel.BLACK },
                });
            }

            await tx.skyBlueNominationEvent.create({
                data: {
                    nominationId: nomination.id,
                    actorId,
                    action: "REVOKED",
                    detail: dto.notes ?? "Sky Blue revoked; cap set to BLACK",
                },
            });

            return updated;
        });
    }

    async list(status?: SkyBlueNominationStatus) {
        return this.prisma.skyBlueNomination.findMany({
            where: status ? { status } : undefined,
            include: this.defaultInclude(),
            orderBy: { createdAt: "desc" },
        });
    }

    async getById(nominationId: string) {
        const nomination = await this.prisma.skyBlueNomination.findUnique({
            where: { id: nominationId },
            include: {
                ...this.defaultInclude(),
                events: { orderBy: { createdAt: "asc" } },
            },
        });
        if (!nomination) {
            throw new NotFoundException("Nomination not found");
        }
        return nomination;
    }

    async getMine(userId: string) {
        return this.prisma.skyBlueNomination.findMany({
            where: { nomineeId: userId },
            include: {
                ...this.defaultInclude(),
                events: { orderBy: { createdAt: "asc" } },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    /** Members cannot apply — only view invitation status */
    async assertCannotSelfApply(_userId: string): Promise<never> {
        throw new ForbiddenException(
            "Sky Blue cannot be applied for. It is invitation-only via committee nomination.",
        );
    }

    private async getOpenNomination(nominationId: string) {
        const nomination = await this.prisma.skyBlueNomination.findUnique({
            where: { id: nominationId },
        });
        if (!nomination) {
            throw new NotFoundException("Nomination not found");
        }
        if (
            nomination.status !== SkyBlueNominationStatus.PENDING &&
            nomination.status !== SkyBlueNominationStatus.IN_REVIEW
        ) {
            throw new BadRequestException(`Nomination is ${nomination.status} and cannot be updated`);
        }
        return nomination;
    }

    private defaultInclude() {
        return {
            nominee: {
                select: {
                    id: true,
                    email: true,
                    capLevel: true,
                    profile: { select: { name: true, avatarUrl: true } },
                },
            },
            nominatedBy: {
                select: {
                    id: true,
                    email: true,
                    profile: { select: { name: true, avatarUrl: true } },
                },
            },
        } as const;
    }
}
