import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import {
    BridgeListingStatus,
    Prisma,
    VolunteerHourVerificationStatus,
} from "@prisma/client";
import {
    guestExploreEnvelope,
    GUEST_JOIN_PROMPT,
    GUEST_LOCKED_ACTIONS,
    GUEST_PUBLIC_ROUTES,
} from "@common/constants/guest-explore.contract";
import { ExploreService } from "./explore.service";
import { GuestExploreQueryDto } from "./dto/guest-explore.dto";

const CAP_VISIBILITY_WEIGHT: Record<string, number> = {
    SKY_BLUE: 600,
    BLACK: 500,
    RED: 400,
    YELLOW: 300,
    GREEN: 200,
    NONE: 100,
};

@Injectable()
export class GuestExploreService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly exploreService: ExploreService,
    ) {}

    getContract() {
        return {
            guestMode: true as const,
            joinPrompt: GUEST_JOIN_PROMPT,
            lockedActions: GUEST_LOCKED_ACTIONS,
            publicRoutes: GUEST_PUBLIC_ROUTES,
        };
    }

    async getGuestHome(query: GuestExploreQueryDto) {
        const limit = query.limit ?? 12;

        const [opportunities, bridge, ngos, communities, impact] = await Promise.all([
            this.listOpportunities({ ...query, limit: Math.min(limit, 6) }),
            this.listBridgePreview(query.search, 6),
            this.exploreService.exploreTopNgos(query.search).then((rows) => rows.slice(0, 6)),
            this.exploreService
                .exploreTopCommunities(query.search)
                .then((rows) => rows.slice(0, 6)),
            this.getImpactSnapshot(),
        ]);

        return guestExploreEnvelope({
            opportunities,
            bridge,
            ngos,
            communities,
            impact,
        });
    }

    async listOpportunities(query: GuestExploreQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 12;
        const skip = (page - 1) * limit;
        const search = query.search?.trim();

        const where: Prisma.VolunteerProjectWhereInput = {
            isActive: true,
            ...(search
                ? {
                      OR: [
                          { title: { contains: search, mode: "insensitive" } },
                          { description: { contains: search, mode: "insensitive" } },
                          { location: { contains: search, mode: "insensitive" } },
                      ],
                  }
                : {}),
        };

        const [items, total] = await Promise.all([
            this.prisma.volunteerProject.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    location: true,
                    startDate: true,
                    endDate: true,
                    createdAt: true,
                    ngo: {
                        select: {
                            id: true,
                            profile: {
                                select: {
                                    name: true,
                                    avatarUrl: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.volunteerProject.count({ where }),
        ]);

        return guestExploreEnvelope({
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });
    }

    async getOpportunityDetail(projectId: string) {
        const project = await this.prisma.volunteerProject.findFirst({
            where: { id: projectId, isActive: true },
            select: {
                id: true,
                title: true,
                description: true,
                location: true,
                startDate: true,
                endDate: true,
                createdAt: true,
                ngo: {
                    select: {
                        id: true,
                        profile: {
                            select: {
                                name: true,
                                avatarUrl: true,
                                title: true,
                            },
                        },
                    },
                },
                _count: { select: { applications: true } },
            },
        });

        if (!project) {
            throw new NotFoundException("Volunteer opportunity not found");
        }

        const { _count, ...rest } = project;

        return guestExploreEnvelope({
            ...rest,
            applicationsCount: _count.applications,
        });
    }

    async getImpactSnapshot() {
        const [
            activeVolunteerProjects,
            openBridgeListings,
            verifiedHoursAgg,
            verifiedMentoringHours,
            membersWithCap,
        ] = await Promise.all([
            this.prisma.volunteerProject.count({ where: { isActive: true } }),
            this.prisma.bridgeListing.count({ where: { status: BridgeListingStatus.OPEN } }),
            this.prisma.volunteerHour.aggregate({
                where: { verificationStatus: VolunteerHourVerificationStatus.VERIFIED },
                _sum: { hours: true },
                _count: true,
            }),
            this.prisma.volunteerHour.aggregate({
                where: {
                    verificationStatus: VolunteerHourVerificationStatus.VERIFIED,
                    contributionType: "MENTORING",
                },
                _sum: { hours: true },
            }),
            this.prisma.user.count({
                where: { capLevel: { not: "NONE" } },
            }),
        ]);

        return guestExploreEnvelope({
            activeVolunteerProjects,
            openBridgeListings,
            totalVerifiedHours: Math.round((verifiedHoursAgg._sum.hours ?? 0) * 100) / 100,
            verifiedHourEntries: verifiedHoursAgg._count,
            verifiedMentoringHours:
                Math.round((verifiedMentoringHours._sum.hours ?? 0) * 100) / 100,
            membersOnCapLadder: membersWithCap,
            note: "Aggregated platform impact — no individual earnings or private member data.",
        });
    }

    private async listBridgePreview(search?: string, limit = 6) {
        const where: Prisma.BridgeListingWhereInput = {
            status: BridgeListingStatus.OPEN,
            ...(search?.trim()
                ? {
                      OR: [
                          { title: { contains: search, mode: "insensitive" } },
                          { description: { contains: search, mode: "insensitive" } },
                      ],
                  }
                : {}),
        };

        const rows = await this.prisma.bridgeListing.findMany({
            where,
            take: 50,
            include: {
                owner: {
                    select: {
                        id: true,
                        capLevel: true,
                        profile: { select: { name: true, avatarUrl: true } },
                    },
                },
            },
        });

        const items = rows
            .map((row) => ({
                id: row.id,
                type: row.type,
                title: row.title,
                description: row.description,
                contributionType: row.contributionType,
                location: row.location,
                remoteOk: row.remoteOk,
                ownerCapLevel: row.ownerCapLevel,
                owner: row.owner,
                visibilityWeight: CAP_VISIBILITY_WEIGHT[row.ownerCapLevel] ?? 0,
                createdAt: row.createdAt,
            }))
            .sort((a, b) => b.visibilityWeight - a.visibilityWeight)
            .slice(0, limit);

        return items;
    }
}
