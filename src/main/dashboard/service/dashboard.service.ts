import { PrismaService } from "@lib/prisma/prisma.service";
import { UpdateReportDto } from "@module/(users)/report/dto/report.dto";
import { Injectable } from "@nestjs/common";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { ReportQueryDto } from "../dto/report.dto";

@Injectable()
export class DashboardService {
    constructor(private prisma: PrismaService) {}

    async getSummary() {
        const now = new Date();
        const startThisMonth = startOfMonth(now);
        const startLastMonth = startOfMonth(subMonths(now, 1));
        const endLastMonth = endOfMonth(subMonths(now, 1));

        // --- Users ---
        const usersThisMonth = await this.prisma.user.count({
            where: { createdAt: { gte: startThisMonth } },
        });

        const usersLastMonth = await this.prisma.user.count({
            where: { createdAt: { gte: startLastMonth, lte: endLastMonth } },
        });

        const userIncreasePercent =
            usersThisMonth + usersLastMonth === 0
                ? 0
                : ((usersThisMonth - usersLastMonth) / (usersThisMonth + usersLastMonth)) * 100;

        // --- Communities ---
        const totalCommunities = await this.prisma.ngo.count();

        const communitiesThisMonth = await this.prisma.ngo.count({
            where: { foundationDate: { gte: startThisMonth } },
        });

        const communitiesLastMonth = await this.prisma.ngo.count({
            where: { foundationDate: { gte: startLastMonth, lte: endLastMonth } },
        });

        const communitiesIncreasePercent =
            communitiesThisMonth + communitiesLastMonth === 0
                ? 0
                : ((communitiesThisMonth - communitiesLastMonth) /
                      (communitiesThisMonth + communitiesLastMonth)) *
                  100;

        // --- Volunteer Projects ---
        const activeVolunteerProjectsCount = await this.prisma.volunteerProject.count({
            where: { isActive: true },
        });

        const volunteerProjectsThisMonth = await this.prisma.volunteerProject.count({
            where: { createdAt: { gte: startThisMonth } },
        });

        const volunteerProjectsLastMonth = await this.prisma.volunteerProject.count({
            where: { createdAt: { gte: startLastMonth, lte: endLastMonth } },
        });

        const volunteerProjectsIncreasePercent =
            volunteerProjectsThisMonth + volunteerProjectsLastMonth === 0
                ? 0
                : ((volunteerProjectsThisMonth - volunteerProjectsLastMonth) /
                      (volunteerProjectsThisMonth + volunteerProjectsLastMonth)) *
                  100;

        // --- Promotion Fee Earnings ---
        const promoThisMonthAgg = await this.prisma.product.aggregate({
            where: { createdAt: { gte: startThisMonth } },
            _sum: { promotionFee: true },
        });

        const promoPrevMonthAgg = await this.prisma.product.aggregate({
            where: { createdAt: { gte: startLastMonth, lte: endLastMonth } },
            _sum: { promotionFee: true },
        });

        const promoThisMonth = promoThisMonthAgg._sum.promotionFee || 0;
        const promoPrevMonth = promoPrevMonthAgg._sum.promotionFee || 0;

        const promoIncreasePercent =
            promoThisMonth + promoPrevMonth === 0
                ? 0
                : ((promoThisMonth - promoPrevMonth) / (promoThisMonth + promoPrevMonth)) * 100;

        // --- Return Summary ---
        return {
            usersThisMonth,
            userIncreasePercent: Number(userIncreasePercent.toFixed(2)),
            totalCommunities,
            communitiesIncreasePercent: Number(communitiesIncreasePercent.toFixed(2)),
            activeVolunteerProjectsCount,
            volunteerProjectsIncreasePercent: Number(volunteerProjectsIncreasePercent.toFixed(2)),
            marketplacePromotionEarningsThisMonth: promoThisMonth,
            promoIncreasePercent: Number(promoIncreasePercent.toFixed(2)),
        };
    }

    async getUserGrowth() {
        const data = [];

        for (let i = 5; i >= 0; i--) {
            const monthStart = startOfMonth(subMonths(new Date(), i));
            const monthEnd = endOfMonth(subMonths(new Date(), i));

            const count = await this.prisma.user.count({
                where: { createdAt: { gte: monthStart, lte: monthEnd } },
            });

            data.push({
                month: monthStart.toLocaleString("en-US", { month: "long" }),
                count,
            });
        }

        return { userGrowth: data };
    }

    async getRevenueTrends() {
        const data = [];

        for (let i = 5; i >= 0; i--) {
            const monthStart = startOfMonth(subMonths(new Date(), i));
            const monthEnd = endOfMonth(subMonths(new Date(), i));
            const total = await this.prisma.product.aggregate({
                where: {
                    createdAt: { gte: monthStart, lte: monthEnd },
                },
                _sum: {
                    promotionFee: true,
                },
            });

            data.push({
                month: monthStart.toLocaleString("en-US", { month: "long" }),
                total: total._sum.promotionFee || 0,
            });
        }

        return { revenueTrends: data };
    }

    async getActivityDivision() {
        const volunteer = await this.prisma.volunteerProject.count();
        const promotions = await this.prisma.product.count({
            where: { promotionFee: { gt: 0 } },
        });
        const donations = await this.prisma.donationLog.count();
        const total = volunteer + promotions + donations;

        return {
            activityDivision: {
                volunteerProjects: total ? Math.round((volunteer / total) * 100) : 0,
                marketplacePromotions: total ? Math.round((promotions / total) * 100) : 0,
                donations: total ? Math.round((donations / total) * 100) : 0,
            },
        };
    }

    async getPendingApplicationsDetailed() {
        // 1. Pending NGO Verification Applications
        // ------------------------------------------------------------
        const ngoVerifications = await this.prisma.ngoVerification.findMany({
            where: { status: "PENDING" },
            select: {
                id: true,
                status: true,
                ngo: {
                    select: {
                        profile: { select: { title: true } },
                    },
                },
                createdAt: true,
            },
        });

        const ngoVerificationFormatted = ngoVerifications.map((nv) => ({
            id: nv.id,
            title: nv.ngo.profile?.title || "Untitled NGO",
            applicationTime: nv.createdAt,
            status: nv.status,
            type: "Ngo Verification",
        }));

        // ------------------------------------------------------------
        // 2. Pending Volunteer Project Applications
        // ------------------------------------------------------------
        const volunteerApplications = await this.prisma.volunteerApplication.findMany({
            where: { status: "PENDING" },
            select: {
                id: true,
                status: true,
                project: { select: { title: true } },
                createdAt: true,
            },
        });

        const volunteerApplicationsFormatted = volunteerApplications.map((va) => ({
            id: va.id,
            title: va.project.title,
            applicationTime: va.createdAt,
            status: va.status,
            type: "Project Verification",
        }));

        // ------------------------------------------------------------
        // 3. Merge + sort all pending applications
        // ------------------------------------------------------------

        const pendingApplications = [
            ...ngoVerificationFormatted,
            ...volunteerApplicationsFormatted,
        ].sort((a, b) => b.applicationTime.getTime() - a.applicationTime.getTime());

        return pendingApplications;
    }

    async getPendingReports(query: ReportQueryDto) {
        const { page, limit } = query;
        const skip = (page - 1) * limit;

        const total = await this.prisma.report.count();

        const reports = await this.prisma.report.findMany({
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                reporter: {
                    select: {
                        id: true,
                        profile: {
                            select: { username: true, name: true, avatarUrl: true },
                        },
                    },
                },
            },
        });

        const resolvedReports = await Promise.all(
            reports.map(async (r) => ({
                ...r,
                target: await this.resolveTarget(r.targetType, r.targetId),
            })),
        );

        return {
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            data: resolvedReports,
        };
    }

    async reviewReport(reportId: string, dto: UpdateReportDto, adminId: string) {
        const exists = await this.prisma.report.findUnique({ where: { id: reportId } });
        if (!exists) throw new Error("Report not found");

        return this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: dto.status,
                adminNotes: dto.adminNotes || null,
                reviewedById: adminId,
            },
        });
    }

    async resolveTarget(type: string, id: string) {
        switch (type) {
            case "POST":
                return this.prisma.post.findUnique({
                    where: { id },
                    select: {
                        id: true,
                        text: true,
                        mediaUrls: true,
                        author: {
                            select: {
                                id: true,
                                profile: { select: { username: true, avatarUrl: true } },
                            },
                        },
                    },
                });

            case "PRODUCT":
                return this.prisma.product.findUnique({
                    where: { id },
                    select: {
                        id: true,
                        title: true,
                        price: true,
                        seller: {
                            select: {
                                id: true,
                                profile: { select: { username: true, avatarUrl: true } },
                            },
                        },
                    },
                });

            case "USER":
                return this.prisma.user.findUnique({
                    where: { id },
                    select: {
                        id: true,
                        profile: { select: { username: true, name: true, avatarUrl: true } },
                    },
                });

            case "COMMENT":
                return this.prisma.comment.findUnique({
                    where: { id },
                    select: {
                        id: true,
                        text: true,
                        author: {
                            select: {
                                id: true,
                                profile: { select: { username: true, avatarUrl: true } },
                            },
                        },
                    },
                });

            default:
                return null;
        }
    }
}
