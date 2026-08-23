import { PrismaService } from "@lib/prisma/prisma.service";
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { MembershipTier } from "@prisma/client";
import {
    CORPORATE_TIER_CATALOG,
    CORPORATE_TIER_ORDER,
    assertValidSdgGoals,
} from "@common/utils/corporate-tier.util";
import {
    CreateCorporateMembershipDto,
    UpdateCorporateEsgReportDto,
    UpdateCorporateMembershipDto,
} from "./dto/corporate-membership.dto";

@Injectable()
export class CorporateService {
    constructor(private readonly prisma: PrismaService) {}

    listTiers() {
        return CORPORATE_TIER_ORDER.map((tier) => ({
            tier,
            ...CORPORATE_TIER_CATALOG[tier],
        }));
    }

    async listMemberships() {
        const rows = await this.prisma.corporateMembership.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                contactPerson: {
                    select: {
                        id: true,
                        email: true,
                        profile: { select: { name: true } },
                    },
                },
            },
        });
        return rows.map((row) => this.withTierMeta(row));
    }

    async getMembership(id: string) {
        const membership = await this.prisma.corporateMembership.findUnique({
            where: { id },
            include: {
                contactPerson: {
                    select: {
                        id: true,
                        email: true,
                        profile: { select: { name: true } },
                    },
                },
            },
        });
        if (!membership) {
            throw new NotFoundException("Corporate membership not found");
        }
        return this.withTierMeta(membership);
    }

    async getMyMembership(userId: string) {
        const membership = await this.prisma.corporateMembership.findFirst({
            where: { contactPersonId: userId, isActive: true },
            include: {
                contactPerson: {
                    select: {
                        id: true,
                        email: true,
                        profile: { select: { name: true } },
                    },
                },
            },
        });
        if (!membership) {
            throw new NotFoundException("No active corporate membership linked to your account");
        }
        return this.withTierMeta(membership);
    }

    async createMembership(dto: CreateCorporateMembershipDto) {
        if (dto.contactPersonId) {
            await this.assertUserExists(dto.contactPersonId);
        }

        const created = await this.prisma.corporateMembership.create({
            data: {
                companyName: dto.companyName,
                contactEmail: dto.contactEmail,
                tier: dto.tier ?? MembershipTier.STARTER,
                contactPersonId: dto.contactPersonId ?? null,
            },
        });
        return this.getMembership(created.id);
    }

    async updateMembership(id: string, dto: UpdateCorporateMembershipDto) {
        await this.getMembership(id);

        if (dto.contactPersonId) {
            await this.assertUserExists(dto.contactPersonId);
        }

        const updated = await this.prisma.corporateMembership.update({
            where: { id },
            data: {
                ...(dto.companyName && { companyName: dto.companyName }),
                ...(dto.contactEmail && { contactEmail: dto.contactEmail }),
                ...(dto.tier && { tier: dto.tier }),
                ...(dto.contactPersonId !== undefined && {
                    contactPersonId: dto.contactPersonId,
                }),
                ...(typeof dto.isActive === "boolean" && { isActive: dto.isActive }),
                ...(dto.endDate && { endDate: new Date(dto.endDate) }),
            },
        });
        return this.withTierMeta(updated);
    }

    async updateEsgReport(id: string, userId: string, dto: UpdateCorporateEsgReportDto, isAdmin: boolean) {
        const membership = await this.prisma.corporateMembership.findUnique({ where: { id } });
        if (!membership) {
            throw new NotFoundException("Corporate membership not found");
        }

        if (!isAdmin && membership.contactPersonId !== userId) {
            throw new ForbiddenException("Only the corporate contact or an admin may submit ESG reports");
        }

        const tierMeta = CORPORATE_TIER_CATALOG[membership.tier];
        if (!tierMeta.esgReporting && !isAdmin) {
            throw new ForbiddenException(
                "ESG reporting is available on Growth and Enterprise tiers. Upgrade to submit SDG/ESG reports.",
            );
        }

        if (dto.sdgAlignmentGoals?.length) {
            try {
                assertValidSdgGoals(dto.sdgAlignmentGoals);
            } catch (err) {
                throw new BadRequestException(err instanceof Error ? err.message : "Invalid SDG goals");
            }
        }

        const updated = await this.prisma.corporateMembership.update({
            where: { id },
            data: {
                ...(dto.sdgAlignmentGoals !== undefined && {
                    sdgAlignmentGoals: dto.sdgAlignmentGoals,
                }),
                ...(dto.sdgImpactSummary !== undefined && {
                    sdgImpactSummary: dto.sdgImpactSummary,
                }),
                ...(dto.esgReportPeriod !== undefined && { esgReportPeriod: dto.esgReportPeriod }),
                ...(dto.esgReportUrl !== undefined && { esgReportUrl: dto.esgReportUrl }),
                ...(dto.reportedVolunteerHours !== undefined && {
                    reportedVolunteerHours: dto.reportedVolunteerHours,
                }),
                ...(dto.reportedCommunityInvestment !== undefined && {
                    reportedCommunityInvestment: dto.reportedCommunityInvestment,
                }),
                ...(dto.reportedCarbonOffsetTonnes !== undefined && {
                    reportedCarbonOffsetTonnes: dto.reportedCarbonOffsetTonnes,
                }),
                lastEsgReportSubmittedAt: new Date(),
            },
        });

        return this.withTierMeta(updated);
    }

    private withTierMeta<T extends { tier: MembershipTier }>(membership: T) {
        const catalog = CORPORATE_TIER_CATALOG[membership.tier];
        return {
            ...membership,
            tierLabel: catalog.label,
            legacyTierLabel: catalog.legacyLabel,
            tierLimits: {
                dailyAdsLimit: catalog.dailyAdsLimit,
                sponsorshipsLimit: catalog.sponsorshipsLimit,
                talentUnlocksLimit: catalog.talentUnlocksLimit,
                talentSearchResultLimit: catalog.talentSearchResultLimit,
                esgReporting: catalog.esgReporting,
            },
            usage: {
                dailyAdsUsed: (membership as { dailyAdsUsed?: number }).dailyAdsUsed ?? 0,
                sponsorshipsUsed: (membership as { sponsorshipsUsed?: number }).sponsorshipsUsed ?? 0,
                talentUnlocksUsed: (membership as { talentUnlocksUsed?: number }).talentUnlocksUsed ?? 0,
            },
        };
    }

    private async assertUserExists(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) {
            throw new BadRequestException("Contact person user not found");
        }
    }
}
