import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class HelperService {
    constructor(private prisma: PrismaService) {}

    async attachProductToEligiblePosts(productId: string) {
        // Step 0: Fetch the product including promotionFee
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new NotFoundException(`Product with ID ${productId} not found`);
        }

        if (product.promotionFee <= 0) {
            console.info("Product has no promotion fee to distribute.");
            return;
        }

        // Step 1: Find eligible posts (no ad yet, author capLevel not NONE)
        const eligiblePosts = await this.prisma.post.findMany({
            where: {
                dedicatedAd: { none: {} }, // posts with no ad
                author: { capLevel: { not: "NONE" } },
            },
            orderBy: { createdAt: "desc" },
            take: 5, // attach product to 5 posts max
            include: {
                author: true, // needed for capLevel
            },
        });

        if (!eligiblePosts.length) {
            console.info("No eligible posts found for this product.");
            return;
        }

        let totalDistributed = 0; // Track total amount distributed

        // Step 2: Prepare all operations for transaction
        const transactionOps = eligiblePosts.map((post) => {
            // Determine capLevel percentage
            let percent = 0;
            switch (post.author.capLevel) {
                case "GREEN":
                    percent = 2;
                    break;
                case "YELLOW":
                    percent = 3;
                    break;
                case "BLACK":
                    percent = 4;
                    break;
                case "RED":
                    percent = 5;
                    break;
            }

            // Calculate revenue amount for this post author
            const revenueAmount = (percent / 100) * product.promotionFee;
            totalDistributed += revenueAmount;

            return [
                // Create DedicatedAd
                this.prisma.dedicatedAd.create({
                    data: {
                        postId: post.id,
                        adId: productId,
                        active: true,
                    },
                }),
                // Create Revenue record
                this.prisma.revenue.create({
                    data: {
                        userId: post.authorId,
                        postId: post.id,
                        adId: productId,
                        amount: revenueAmount,
                        type: "view",
                    },
                }),
            ];
        });

        // Flatten all operations
        const allOps = transactionOps.flat();

        // Step 3: Execute all in a single transaction
        await this.prisma.$transaction(allOps);

        // Step 4: Update product.spent with total distributed amount
        await this.prisma.product.update({
            where: { id: productId },
            data: {
                spent: product.spent + totalDistributed,
            },
        });

        console.info(
            `Product (${productId}) attached to ${eligiblePosts.length} posts. Total distributed: ${totalDistributed}`,
        );
    }
}
