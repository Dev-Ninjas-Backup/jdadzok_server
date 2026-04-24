import { Module } from "@nestjs/common";
import { FavouritelistService } from "./favoritelist.service";
import { FavouritelistController } from "./favouritelist.controller";

@Module({
    controllers: [FavouritelistController],
    providers: [FavouritelistService],
})
export class FavouritelistModule {}
