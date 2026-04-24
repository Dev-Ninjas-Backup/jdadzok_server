import { Module } from "@nestjs/common";
import { PostTagsController } from "./post-tags.controller";
import { PostTagsRepository } from "./post-tags.repository";
import { PostTagsService } from "./post-tags.service";

@Module({
    controllers: [PostTagsController],
    providers: [PostTagsRepository, PostTagsService],
    exports: [PostTagsRepository],
})
export class PostTagsModule {}
