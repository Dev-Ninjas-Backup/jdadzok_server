import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class HideService {
    constructor(private readonly prisma: PrismaService) {}

    async toggleVisibility(productId: string) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new NotFoundException("Product not found");
        }
        return this.prisma.product.update({
            where: { id: productId },
            data: { isVisible: !product.isVisible },
        });
    }
}
