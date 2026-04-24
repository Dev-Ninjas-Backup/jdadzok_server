import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { ProductOrderDto, ProductOrderSearchDto } from "../dto/productOrder.dto";
import { OrderStatus } from "@prisma/client";

@Injectable()
export class PayoutManagementService {
    constructor(private prisma: PrismaService) {}

    async getSummary() {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalPending = await this.prisma.order.count({
            where: { status: "PENDING" },
        });

        const totalPaid = await this.prisma.order.count({
            where: { status: "PAID" },
        });

        const paidThisMonth = await this.prisma.order.aggregate({
            where: {
                status: "PAID",
                updatedAt: { gte: monthStart },
            },
            _sum: { totalPrice: true },
        });

        const totalAmount = await this.prisma.order.aggregate({
            where: {
                status: { in: ["PENDING", "PAID"] },
            },
            _sum: { totalPrice: true },
        });

        return {
            totalPending,
            totalPaid,
            paidThisMonth: paidThisMonth._sum.totalPrice || 0,
            paidTotalAmount: totalAmount._sum.totalPrice || 0,
        };
    }

    async searchPaidOrders(searchDto: ProductOrderSearchDto): Promise<ProductOrderDto[]> {
        const { sellerName } = searchDto;

        // Fetch paid orders with optional seller name search
        const orders = await this.prisma.order.findMany({
            where: {
                status: OrderStatus.PAID,
                product: {
                    seller: {
                        profile: {
                            name: sellerName
                                ? { contains: sellerName, mode: "insensitive" }
                                : undefined,
                        },
                    },
                },
            },
            include: {
                product: {
                    include: {
                        seller: {
                            include: { profile: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const result: ProductOrderDto[] = [];

        for (const order of orders) {
            // Calculate total earned for this product
            const totalEarned = await this.prisma.order.aggregate({
                _sum: { totalPrice: true },
                where: {
                    productId: order.productId,
                    status: OrderStatus.PAID,
                },
            });

            result.push({
                productId: order.productId,
                productTitle: order.product.title,
                sellerId: order.product.sellerId,
                sellerName: order.product.seller.profile?.name || null,
                sellerEmail: order.product.seller.email,
                orderId: order.id,
                orderAmount: order.totalPrice,
                orderDate: order.createdAt,
                totalEarnedBySeller: totalEarned._sum?.totalPrice || 0,
            });
        }

        return result;
    }
}
