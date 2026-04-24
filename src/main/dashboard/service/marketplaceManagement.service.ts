import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { PaymentStatus, Prisma } from "@prisma/client";
import { ProductQueryDto } from "../dto/producQuery.dto";

@Injectable()
export class MarketplaceManagementService {
    constructor(private readonly prisma: PrismaService) {}

    async getMarketplaceStats() {
        // total products
        const totalProducts = await this.prisma.product.count();

        // active listings (visible and status = CONTINUED)
        const activeListings = await this.prisma.product.count({
            where: { isVisible: true, status: "CONTINUED" },
        });

        // featured items (any dedicatedAd row)
        const featuredItems = await this.prisma.product.count({
            where: { dedicatedAd: { some: {} } },
        });

        // total sales (sum of completed payments amounts)
        const totalSalesAgg = await this.prisma.payment.aggregate({
            _sum: { amount: true },
            where: {
                status: PaymentStatus.SUCCEEDED,
            },
        });

        const totalSales = totalSalesAgg?._sum?.amount ?? 0; // <-- fixed

        return {
            totalProducts,
            activeListings,
            featuredItems,
            totalSales,
        };
    }

    // --- Product listing with pagination, search, filters ---
    async listProducts(dto: ProductQueryDto) {
        const { search, page = 1, limit = 10, status, featured } = dto;
        const skip = (page - 1) * limit;

        // Build typed where clause
        const where: Prisma.ProductWhereInput | undefined = {
            AND: [
                search
                    ? {
                          OR: [
                              { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
                              {
                                  // search by seller profile name
                                  seller: {
                                      profile: {
                                          name: {
                                              contains: search,
                                              mode: Prisma.QueryMode.insensitive,
                                          },
                                      },
                                  },
                              },
                          ],
                      }
                    : undefined,
                status ? { status } : undefined,
                typeof featured === "boolean"
                    ? featured
                        ? { dedicatedAd: { some: {} } }
                        : { dedicatedAd: { none: {} } }
                    : undefined,
            ].filter(Boolean) as Prisma.ProductWhereInput[],
        };

        // Get products (include orders->payments so we can calculate sales)
        const [products, total] = await this.prisma.$transaction([
            this.prisma.product.findMany({
                where,
                include: {
                    seller: { include: { profile: true } },
                    category: true,
                    // include orders + payments so we can compute sales client-side in this service
                    orders: { include: { payments: true } },
                    dedicatedAd: true,
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            this.prisma.product.count({ where }),
        ]);

        // Format list rows
        const data = products.map((p) => {
            const stock = p.availability ?? 0;
            // sales count = total units sold from completed orders/payments
            // sum order.quantity where payment.status === 'COMPLETED'
            let salesUnits = 0;
            let totalSalesAmount = 0;
            for (const o of p.orders ?? []) {
                // if order has one or more completed payments we count it as completed
                const completedPayments = (o.payments ?? []).filter(
                    (pm) => pm.status === PaymentStatus.SUCCEEDED,
                );

                if (completedPayments.length > 0) {
                    salesUnits += o.quantity ?? 0;
                    totalSalesAmount += completedPayments.reduce(
                        (s, pm) => s + (pm.amount ?? 0),
                        0,
                    );
                }
            }

            // rating placeholder (no Review model in your schema). Replace with actual logic if you have ratings.
            const rating = null;

            return {
                id: p.id,
                title: p.title,
                seller: p.seller?.profile?.name ?? p.seller?.email ?? "Unknown",
                category: p.category?.name ?? null,
                price: p.price,
                stock,
                sales: salesUnits,
                totalSalesAmount,
                rating,
                status: p.status,
                isFeatured: (p.dedicatedAd?.length ?? 0) > 0,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
            };
        });

        return {
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            data,
        };
    }
}
