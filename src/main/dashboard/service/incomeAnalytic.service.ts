import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";

import { OrderStatus } from "@prisma/client";

@Injectable()
export class IncomeAnalyticService {
    constructor(private readonly prisma: PrismaService) {}

    async getOverview() {
        const now = new Date();

        const startThisMonth = startOfMonth(now);
        const startLastMonth = startOfMonth(subMonths(now, 1));
        const endLastMonth = endOfMonth(subMonths(now, 1));
        const promoThisMonthAgg = await this.prisma.product.aggregate({
            where: { createdAt: { gte: startThisMonth } },
            _sum: { promotionFee: true },
        });

        const promoPrevMonthAgg = await this.prisma.product.aggregate({
            where: { createdAt: { gte: startLastMonth, lte: endLastMonth } },
            _sum: { promotionFee: true },
        });

        const promoThisMonth = promoThisMonthAgg._sum?.promotionFee ?? 0;
        const promoPrevMonth = promoPrevMonthAgg._sum?.promotionFee ?? 0;

        const revenueIncreasePercent =
            promoPrevMonth === 0 ? 100 : ((promoThisMonth - promoPrevMonth) / promoPrevMonth) * 100;

        const commisionIncreasePercent = revenueIncreasePercent;

        const totalPaid = await this.prisma.order.aggregate({
            where: { status: "PAID" },
            _sum: {
                totalPrice: true,
            },
        });

        const sellerPayouts = totalPaid._sum.totalPrice ?? 0;

        const pendingAgg = await this.prisma.sellerEarnings.aggregate({
            _sum: { pending: true },
        });

        const pendingPayouts = pendingAgg._sum?.pending ?? 0;

        const aovThisMonthAgg = await this.prisma.order.aggregate({
            _avg: { totalPrice: true },
            where: {
                createdAt: { gte: startThisMonth },
                status: OrderStatus.PENDING,
            },
        });

        const avgOrderValue = aovThisMonthAgg._avg?.totalPrice ?? 0;

        const aovLastMonthAgg = await this.prisma.order.aggregate({
            _avg: { totalPrice: true },
            where: {
                createdAt: { gte: startLastMonth, lte: endLastMonth },
                status: OrderStatus.PENDING,
            },
        });

        const aovLastMonth = aovLastMonthAgg._avg?.totalPrice ?? 0;

        const avgOrderIncreasePercent =
            aovLastMonth === 0 ? 100 : ((avgOrderValue - aovLastMonth) / aovLastMonth) * 100;

        return {
            // Revenue
            totalRevenue: promoThisMonth,
            revenueIncreasePercent: Number(revenueIncreasePercent.toFixed(2)),
            platformCommision: promoThisMonth,
            commisionIncreasePercent: Number(commisionIncreasePercent.toFixed(2)),
            sellerPayouts,
            pendingPayouts,
            avgOrderValue,
            avgOrderIncreasePercent: Number(avgOrderIncreasePercent.toFixed(2)),
        };
    }

    async getRevenueGrowth() {
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

    async getRevenueCategory() {
        const volunteer = await this.prisma.volunteerProject.count();
        const promotions = await this.prisma.product.count({
            where: { promotionFee: { gt: 0 } },
        });
        const donations = await this.prisma.donationLog.count();

        const total = volunteer + promotions + donations;

        const promoRevenueAgg = await this.prisma.product.aggregate({
            _sum: { promotionFee: true },
        });

        const marketplaceTotalRevenue = promoRevenueAgg._sum.promotionFee || 0;

        return {
            volunteerProjects: total ? Math.round((volunteer / total) * 100) : 0,
            marketplacePromotions: total ? Math.round((promotions / total) * 100) : 0,
            donations: total ? Math.round((donations / total) * 100) : 0,

            // added field
            marketplaceTotalRevenue: Number(marketplaceTotalRevenue.toFixed(2)),
        };
    }

    async getTopSellers() {
        // Fetch all users with products + orders + profile
        const users = await this.prisma.user.findMany({
            include: {
                profile: true,
                products: {
                    include: {
                        orders: true,
                    },
                },
            },
        });

        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const sellerAnalytics = [];

        for (const user of users) {
            // Skip users without any product
            if (!user.products || user.products.length === 0) continue;

            let totalOrders = 0;
            let totalRevenue = 0;
            let totalCommission = 0;

            let ordersThisMonth = 0;
            let ordersLastMonth = 0;

            for (const product of user.products) {
                const productOrders = product.orders;

                totalOrders += productOrders.length;
                /* eslint-disable @typescript-eslint/no-unused-vars */
                totalRevenue += productOrders.reduce((s, o) => s + o.totalPrice, 0);
                totalCommission += productOrders.reduce(
                    (s, o) => s + (product.promotionFee || 0),
                    0,
                );

                for (const order of productOrders) {
                    const date = order.createdAt;
                    if (date >= startOfThisMonth) ordersThisMonth++;
                    if (date >= startOfLastMonth && date <= endOfLastMonth) ordersLastMonth++;
                }
            }

            const orderIncreaseRate =
                ordersLastMonth > 0
                    ? Number(
                          (((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100).toFixed(
                              1,
                          ),
                      )
                    : 100;

            sellerAnalytics.push({
                sellerId: user.id,
                sellerName: user.profile?.name ?? null,
                totalOrders,
                totalRevenue,
                totalCommission: Number(totalCommission.toFixed(2)),
                ordersThisMonth,
                ordersLastMonth,
                orderIncreaseRate: Number(orderIncreaseRate.toFixed(2)),
            });
        }

        // Sort by totalRevenue
        const topSellers = sellerAnalytics.sort((a, b) => b.totalRevenue - a.totalRevenue);

        return {
            status: "success",
            message: "Top seller analytics",
            data: topSellers,
        };
    }
}
