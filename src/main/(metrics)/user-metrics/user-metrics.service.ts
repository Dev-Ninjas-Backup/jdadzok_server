import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { MetricsRange, MetricsType, UserMetricsFilterDto } from "./dto/update-user-metrics.dto";

@Injectable()
export class UserMetricsService {
    constructor(private readonly prisma: PrismaService) {}

    async getUserMetrics(userId: string, filter?: UserMetricsFilterDto) {
        // 1️⃣ Get user metrics
        const metrics = await this.prisma.userMetrics.findUnique({
            where: { userId },
            include: {
                user: {
                    select: {
                        capLevel: true,
                        products: { select: { id: true }, take: 1 },
                    },
                },
            },
        });

        if (!metrics) {
            throw new NotFoundException("User metrics not found");
        }

        const response: any = { ...metrics };
        if (metrics.user.products.length > 0) {
            const fromDate = this.getFromDate(filter?.range ?? MetricsRange.DAYS_7);

            const paidOrders = await this.prisma.order.findMany({
                where: {
                    product: {
                        sellerId: userId,
                    },
                    createdAt: { gte: fromDate },
                    payments: {
                        some: {
                            status: "SUCCEEDED",
                        },
                    },
                },
                select: {
                    totalPrice: true,
                },
            });

            const paidOrderCount = paidOrders.length;
            const paidOrderBalance = paidOrders.reduce((sum, order) => sum + order.totalPrice, 0);
            const adRevenue = await this.prisma.adRevenueShare.aggregate({
                where: {
                    userId,
                    createdAt: { gte: fromDate },
                },
                _sum: { amount: true },
            });
            const adRevenueAmount = adRevenue._sum.amount ?? 0;
            response.seller = {
                paidOrderCount,
                paidOrderBalance,
                adRevenueAmount,
                totalEarnings: paidOrderBalance + adRevenueAmount,
            };
        }

        if (filter?.type && filter?.range) {
            const fromDate = this.getFromDate(filter?.range);
            let count = 0;

            switch (filter.type) {
                case MetricsType.POST:
                    count = await this.prisma.post.count({
                        where: { authorId: userId, createdAt: { gte: fromDate } },
                    });
                    break;
                case MetricsType.LIKE:
                    count = await this.prisma.like.count({
                        where: { userId, createdAt: { gte: fromDate } },
                    });
                    break;
                case MetricsType.COMMENT:
                    count = await this.prisma.comment.count({
                        where: { id: userId, createdAt: { gte: fromDate } },
                    });
                    break;
                case MetricsType.SHARE:
                    count = await this.prisma.share.count({
                        where: { userId, createdAt: { gte: fromDate } },
                    });
                    break;
                case MetricsType.FOLLOWER:
                    count = await this.prisma.follow.count({
                        where: { followingId: userId, createdAt: { gte: fromDate } },
                    });
                    break;
            }

            response.filteredCount = {
                type: filter.type,
                range: filter.range,
                count,
            };
        }

        return response;
    }

    private getFromDate(range: MetricsRange): Date {
        const now = new Date();

        switch (range) {
            case MetricsRange.DAYS_7:
                return new Date(now.setDate(now.getDate() - 7));

            case MetricsRange.MONTH_1:
                return new Date(now.setMonth(now.getMonth() - 1));

            case MetricsRange.MONTH_6:
                return new Date(now.setMonth(now.getMonth() - 6));

            case MetricsRange.YEAR_1:
                return new Date(now.setFullYear(now.getFullYear() - 1));

            default:
                return now;
        }
    }
}
