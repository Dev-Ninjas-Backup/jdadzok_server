import { PrismaService } from "@lib/prisma/prisma.service";
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import {
    BridgeListingStatus,
    Prisma,
    Role,
    SponsoredTargetType,
} from "@prisma/client";
import { CORPORATE_TIER_CATALOG } from "@common/utils/corporate-tier.util";
import { CreateSponsoredOpportunityDto } from "./dto/sponsored-opportunity.dto";

@Injectable()
export class SponsoredOpportunityService {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        userId: string,
        role: Role,
        dto: CreateSponsoredOpportunityDto,
    ) {
        const membership = await this.resolveMembership(userId, role, dto.corporateMembershipId);

        if (!membership.isActive) {
            throw new ForbiddenException("Corporate membership is not active");
        }

        await this.assertTargetValid(dto);
        await this.assertNoActiveSponsorship(dto);
        await this.assertSponsorshipQuota(membership.id, membership.tier);

        const sponsorship = await this.prisma.$transaction(async (tx) => {
            const created = await tx.sponsoredOpportunity.create({
                data: {
                    corporateMembershipId: membership.id,
                    targetType: dto.targetType,
                    volunteerProjectId:
                        dto.targetType === SponsoredTargetType.VOLUNTEER_PROJECT
                            ? dto.volunteerProjectId
                            : null,
                    bridgeListingId:
                        dto.targetType === SponsoredTargetType.BRIDGE_LISTING
                            ? dto.bridgeListingId
                            : null,
                    title: dto.title ?? null,
                    message: dto.message ?? null,
                    budgetAmount: dto.budgetAmount ?? null,
                    endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
                },
            });

            await tx.corporateMembership.update({
                where: { id: membership.id },
                data: { sponsorshipsUsed: { increment: 1 } },
            });

            return created;
        });

        return this.getById(sponsorship.id);
    }

    async listForMembership(userId: string, role: Role, corporateMembershipId?: string) {
        const membership = await this.resolveMembership(userId, role, corporateMembershipId);

        const rows = await this.prisma.sponsoredOpportunity.findMany({
            where: { corporateMembershipId: membership.id },
            orderBy: { createdAt: "desc" },
            include: {
                corporateMembership: {
                    select: {
                        id: true,
                        companyName: true,
                        tier: true,
                    },
                },
                ...this.includeTargets(),
            },
        });

        return rows.map((row) => this.toResponse(row));
    }

    async deactivate(id: string, userId: string, role: Role) {
        const sponsorship = await this.prisma.sponsoredOpportunity.findUnique({
            where: { id },
            include: { corporateMembership: true },
        });
        if (!sponsorship) {
            throw new NotFoundException("Sponsored opportunity not found");
        }

        const isAdmin = role === Role.ADMIN || role === Role.SUPER_ADMIN;
        if (!isAdmin && sponsorship.corporateMembership.contactPersonId !== userId) {
            throw new ForbiddenException("Not allowed to deactivate this sponsorship");
        }

        if (!sponsorship.active) {
            return this.getById(id);
        }

        await this.prisma.$transaction([
            this.prisma.sponsoredOpportunity.update({
                where: { id },
                data: { active: false },
            }),
            this.prisma.corporateMembership.update({
                where: { id: sponsorship.corporateMembershipId },
                data: { sponsorshipsUsed: { decrement: 1 } },
            }),
        ]);

        return this.getById(id);
    }

    async discoverActive(targetType?: SponsoredTargetType) {
        const now = new Date();
        const where: Prisma.SponsoredOpportunityWhereInput = {
            active: true,
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            ...(targetType ? { targetType } : {}),
        };

        const rows = await this.prisma.sponsoredOpportunity.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                corporateMembership: {
                    select: {
                        id: true,
                        companyName: true,
                        tier: true,
                    },
                },
                ...this.includeTargets(),
            },
        });

        return rows.map((row) => this.toResponse(row));
    }

    async getById(id: string) {
        const row = await this.prisma.sponsoredOpportunity.findUnique({
            where: { id },
            include: {
                corporateMembership: {
                    select: {
                        id: true,
                        companyName: true,
                        tier: true,
                    },
                },
                ...this.includeTargets(),
            },
        });
        if (!row) {
            throw new NotFoundException("Sponsored opportunity not found");
        }
        return this.toResponse(row);
    }

    private includeTargets() {
        return {
            volunteerProject: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    location: true,
                    isActive: true,
                },
            },
            bridgeListing: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    type: true,
                    status: true,
                    location: true,
                    remoteOk: true,
                },
            },
        } as const;
    }

    private toResponse(row: {
        id: string;
        targetType: SponsoredTargetType;
        title: string | null;
        message: string | null;
        budgetAmount: number | null;
        active: boolean;
        startsAt: Date;
        endsAt: Date | null;
        createdAt: Date;
        corporateMembership: { id: string; companyName: string; tier: string };
        volunteerProject?: unknown;
        bridgeListing?: unknown;
    }) {
        return {
            id: row.id,
            targetType: row.targetType,
            title: row.title,
            message: row.message,
            budgetAmount: row.budgetAmount,
            active: row.active,
            startsAt: row.startsAt,
            endsAt: row.endsAt,
            createdAt: row.createdAt,
            sponsor: row.corporateMembership,
            volunteerProject: row.volunteerProject ?? null,
            bridgeListing: row.bridgeListing ?? null,
        };
    }

    private async resolveMembership(userId: string, role: Role, corporateMembershipId?: string) {
        const isAdmin = role === Role.ADMIN || role === Role.SUPER_ADMIN;

        if (corporateMembershipId) {
            if (!isAdmin) {
                throw new ForbiddenException("Only admins may specify corporateMembershipId");
            }
            const membership = await this.prisma.corporateMembership.findUnique({
                where: { id: corporateMembershipId },
            });
            if (!membership) {
                throw new NotFoundException("Corporate membership not found");
            }
            return membership;
        }

        const membership = await this.prisma.corporateMembership.findFirst({
            where: { contactPersonId: userId, isActive: true },
        });
        if (!membership) {
            throw new ForbiddenException("No active corporate membership linked to your account");
        }
        return membership;
    }

    private async assertTargetValid(dto: CreateSponsoredOpportunityDto) {
        if (dto.targetType === SponsoredTargetType.VOLUNTEER_PROJECT) {
            if (!dto.volunteerProjectId) {
                throw new BadRequestException("volunteerProjectId is required for VOLUNTEER_PROJECT");
            }
            if (dto.bridgeListingId) {
                throw new BadRequestException("bridgeListingId must not be set for VOLUNTEER_PROJECT");
            }
            const project = await this.prisma.volunteerProject.findFirst({
                where: { id: dto.volunteerProjectId, isActive: true },
            });
            if (!project) {
                throw new NotFoundException("Active volunteer project not found");
            }
            return;
        }

        if (!dto.bridgeListingId) {
            throw new BadRequestException("bridgeListingId is required for BRIDGE_LISTING");
        }
        if (dto.volunteerProjectId) {
            throw new BadRequestException("volunteerProjectId must not be set for BRIDGE_LISTING");
        }
        const listing = await this.prisma.bridgeListing.findFirst({
            where: { id: dto.bridgeListingId, status: BridgeListingStatus.OPEN },
        });
        if (!listing) {
            throw new NotFoundException("Open Bridge listing not found");
        }
    }

    private async assertNoActiveSponsorship(dto: CreateSponsoredOpportunityDto) {
        const existing = await this.prisma.sponsoredOpportunity.findFirst({
            where: {
                active: true,
                ...(dto.targetType === SponsoredTargetType.VOLUNTEER_PROJECT
                    ? { volunteerProjectId: dto.volunteerProjectId }
                    : { bridgeListingId: dto.bridgeListingId }),
            },
        });
        if (existing) {
            throw new BadRequestException("This opportunity already has an active sponsorship");
        }
    }

    private async assertSponsorshipQuota(membershipId: string, tier: keyof typeof CORPORATE_TIER_CATALOG) {
        const limit = CORPORATE_TIER_CATALOG[tier].sponsorshipsLimit;
        const activeCount = await this.prisma.sponsoredOpportunity.count({
            where: { corporateMembershipId: membershipId, active: true },
        });
        if (activeCount >= limit) {
            throw new ForbiddenException(
                `Sponsorship limit reached for ${CORPORATE_TIER_CATALOG[tier].label} tier (${limit} active)`,
            );
        }
    }
}
