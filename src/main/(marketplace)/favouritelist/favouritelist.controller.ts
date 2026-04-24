import { GetUser } from "@common/jwt/jwt.decorator";
import { handleRequest } from "@common/utils/handle.request.util";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { Controller, Delete, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { FavouritelistService } from "./favoritelist.service";

@Controller("favouritelists")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class FavouritelistController {
    constructor(private readonly service: FavouritelistService) {}

    @Post(":productId")
    async addToFavouritelist(
        @Param("productId") productId: string,
        @GetUser("userId") userId: string,
    ) {
        return handleRequest(
            () => this.service.addToFavouritelist(userId, productId),
            "Save to favourite list",
        );
    }

    @Delete(":productId")
    async removeFromFavouritelist(
        @Param("productId") productId: string,
        @GetUser("userId") userId: string,
    ) {
        return handleRequest(
            () => this.service.removeFromFavouritelist(userId, productId),
            "Remove from favourite list",
        );
    }
}
