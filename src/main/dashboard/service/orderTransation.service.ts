import { Injectable } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { OrderStatus } from "@prisma/client";
import { OrderListQueryDto } from "../dto/orderListQuery.dto";

@Injectable()
export class OrderTransactionService {
    constructor(private prisma: PrismaService) {}

    async getDashboardStats() {
        const startOfThisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const startOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
        const endOfLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0);

        const totalOrders = await this.prisma.order.count();

        const ordersThisMonth = await this.prisma.order.count({
            where: { createdAt: { gte: startOfThisMonth } },
        });

        const ordersLastMonth = await this.prisma.order.count({
            where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        });

        const orderIncreaseRate =
            ordersLastMonth > 0
                ? Number((((ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100).toFixed(1))
                : 100;

        const totalRevenue = await this.prisma.payment.aggregate({
            _sum: { amount: true },
            where: { status: "SUCCEEDED" },
        });
        const revenueThisMonth = await this.prisma.payment.aggregate({
            _sum: { amount: true },
            where: { status: "SUCCEEDED", createdAt: { gte: startOfThisMonth } },
        });

        const revenueLastMonth = await this.prisma.payment.aggregate({
            _sum: { amount: true },
            where: {
                status: "SUCCEEDED",
                createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
            },
        });

        const revenueIncreaseRate =
            (revenueLastMonth._sum.amount || 0) > 0
                ? Number(
                      (((revenueThisMonth._sum.amount || 0) - (revenueLastMonth._sum.amount || 0)) /
                          (revenueLastMonth._sum.amount || 1)) *
                          100,
                  )
                : 100;

        const orders = await this.prisma.order.findMany({
            select: {
                product: { select: { promotionFee: true } },
                createdAt: true,
            },
        });

        const totalCommission = orders.reduce(
            (sum, order) => sum + (order.product?.promotionFee || 0),
            0,
        );

        const commissionThisMonth = orders
            .filter((o) => o.createdAt >= startOfThisMonth)
            .reduce((sum, o) => sum + (o.product?.promotionFee || 0), 0);

        const commissionLastMonth = orders
            .filter((o) => o.createdAt >= startOfLastMonth && o.createdAt <= endOfLastMonth)
            .reduce((sum, o) => sum + (o.product?.promotionFee || 0), 0);

        const commissionIncreaseRate =
            commissionLastMonth > 0
                ? Number(
                      (
                          ((commissionThisMonth - commissionLastMonth) / commissionLastMonth) *
                          100
                      ).toFixed(1),
                  )
                : 100;

        const completedOrders = await this.prisma.order.count({
            where: { status: OrderStatus.PAID },
        });
        return {
            totalOrders,
            orderIncreaseRate: Number(orderIncreaseRate.toFixed(2)),

            totalRevenue: totalRevenue._sum.amount || 0,
            revenueIncreaseRate: Number(revenueIncreaseRate.toFixed(2)),

            commission: Number(totalCommission.toFixed(2)),
            commissionIncreaseRate: Number(commissionIncreaseRate.toFixed(2)),

            completedOrders,
            completionRate:
                totalOrders > 0 ? Number(((completedOrders / totalOrders) * 100).toFixed(1)) : 0,
        };
    }

    async listOrders(query: OrderListQueryDto) {
        const { status, search } = query;

        const page = query.page ? parseInt(query.page, 10) : 1;
        const limit = query.limit ? parseInt(query.limit, 10) : 10;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (status) where.status = status;

        if (search) {
            where.OR = [
                { id: { contains: search, mode: "insensitive" } },
                {
                    buyer: {
                        profile: {
                            name: { contains: search, mode: "insensitive" },
                        },
                    },
                },
            ];
        }
        const [data, total] = await this.prisma.$transaction([
            this.prisma.order.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    totalPrice: true,
                    status: true,
                    createdAt: true,

                    buyer: {
                        select: {
                            profile: { select: { name: true } },
                        },
                    },
                    product: {
                        select: {
                            title: true,
                            price: true,
                            promotionFee: true,
                            seller: {
                                select: {
                                    profile: { select: { name: true } },
                                },
                            },
                        },
                    },
                },
            }),

            this.prisma.order.count({ where }),
        ]);

        return {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            data,
        };
    }
}
