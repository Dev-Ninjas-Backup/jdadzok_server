import { PrismaService } from "@lib/prisma/prisma.service";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class FavouritelistService {
    constructor(private readonly prisma: PrismaService) {}
    // add wishlist...

    async addToFavouritelist(userId: string, productId: string) {
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new NotFoundException("Product Not Found");
        }
        const exists = await this.prisma.wishlist.findFirst({
            where: { userId, productId },
        });
        if (exists) {
            throw new BadRequestException("Already in Wishlist");
        }

        return this.prisma.wishlist.create({
            data: {
                userId: userId,
                productId: productId,
            },
            include: {
                product: true,
            },
        });
    }

    async removeFromFavouritelist(userId: string, productId: string) {
        const favouriteList = await this.prisma.wishlist.findFirst({
            where: { userId, productId },
        });
        if (!favouriteList) {
            throw new NotFoundException("Favouritelist item not found");
        }
        return this.prisma.wishlist.delete({
            where: { id: favouriteList.id },
        });
    }
}
