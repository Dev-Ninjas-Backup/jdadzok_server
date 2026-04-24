import { Module } from "@nestjs/common";
import { PostFeaturedService } from "./post.featured.service";
import { PostFeaturedController } from "./post.featured.controller";

@Module({
    controllers: [PostFeaturedController],
    providers: [PostFeaturedService],
})
export class PostFeaturedModule {}
