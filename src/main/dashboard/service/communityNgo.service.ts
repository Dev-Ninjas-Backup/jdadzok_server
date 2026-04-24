import { verificationStatus } from "@constants/enums";
import { PrismaService } from "@lib/prisma/prisma.service";
import { ReviewNgoVerificationDto } from "@module/(explore)/ngo/ngoVerification/dto/verification.dto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class CommunityNgoService {
    constructor(private readonly prisma: PrismaService) {}

    async getOverview() {
        let totalCommunityAndNgo = 0;
        const totalCommunities = await this.prisma.community.count();
        const totalNgo = await this.prisma.ngo.count();
        totalCommunityAndNgo = totalCommunities + totalNgo;

        const verified = await this.prisma.ngoVerification.count({
            where: { status: "APPROVED" },
        });

        const pending = await this.prisma.ngoVerification.count({
            where: { status: "PENDING" },
        });
        const ngo = await this.prisma.ngoProfile.aggregate({
            _sum: { followersCount: true },
        });

        const community = await this.prisma.communityProfile.aggregate({
            _sum: { followersCount: true },
        });
        return {
            totalCommunityAndNgo,
            Verified: verified,
            PendingVerification: pending,
            totalFollowers: (ngo._sum.followersCount || 0) + (community._sum.followersCount || 0),
        };
    }

    async getOrganizations({
        search,
        page,
        limit,
    }: {
        search?: string;
        page: number;
        limit: number;
    }) {
        // ---------------- NGO ----------------
        const ngoWhere: any = {};
        if (search) {
            ngoWhere.profile = {
                title: { contains: search, mode: "insensitive" },
            };
        }

        const communityWhere: any = {};
        if (search) {
            communityWhere.profile = {
                title: { contains: search, mode: "insensitive" },
            };
        }
        const ngos = await this.prisma.ngo.findMany({
            where: ngoWhere,
            include: {
                profile: true,
                owner: {
                    include: { profile: true },
                },
                _count: {
                    select: { projects: true }, // counts the number of projects
                },
                verifications: {
                    select: { id: true, status: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
        });

        const ngoData = ngos.map((ngo) => ({
            type: "NGO",
            id: ngo.id,
            title: ngo.profile?.name,
            ownerName: ngo.owner.profile?.name ?? "Unknown", // NGO name
            followersCount: ngo.profile?.followersCount ?? 0,
            status: ngo.isVerified ? "verified" : "pending",
            projectsCount: ngo._count.projects,
            verificationId: ngo.verifications?.[0]?.id ?? null,
            verificationStatus: ngo.verifications?.[0]?.status ?? null,
        }));

        // ---------------- COMMUNITY ----------------
        const communities = await this.prisma.community.findMany({
            where: communityWhere,
            include: {
                owner: {
                    include: { profile: true }, // <-- include profile
                },
                profile: true,
            },
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
        });

        const communityData = communities.map((c) => ({
            type: "COMMUNITY",
            id: c.id,
            title: c.profile?.title,
            ownerName: c.owner.profile?.name,
            followersCount: c.profile?.followersCount ?? 0,
            verificationId: null,
            verificationStatus: null,
        }));

        // ---------------- MERGE ----------------
        const merged = [...ngoData, ...communityData];

        // Total count
        const total = merged.length;

        return {
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            data: merged,
        };
    }

    async reviewVerification(
        adminId: string,
        verificationId: string,
        dto: ReviewNgoVerificationDto,
    ) {
        // Check admin role
        const user = await this.prisma.user.findUnique({ where: { id: adminId } });
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            throw new BadRequestException("Unauthorized access.");
        }

        // Check verification exists
        const verification = await this.prisma.ngoVerification.findUnique({
            where: { id: verificationId },
        });
        if (!verification) throw new NotFoundException("Verification request not found");

        // Update verification status
        const updated = await this.prisma.ngoVerification.update({
            where: { id: verificationId },
            data: {
                status: dto.status,
                reviewedById: adminId,
            },
        });

        // Update NGO verification if approved
        if (verificationStatus.includes(dto.status)) {
            await this.prisma.ngo.update({
                where: { id: verification.ngoId },
                data: { isVerified: dto.status === "APPROVED" },
            });
        }

        return updated;
    }
}
