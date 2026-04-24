import { Module } from "@nestjs/common";
import { PostMetadataController } from "./post.metadata.controller";
import { PostMetadataRepository } from "./post.metadata.repository";
import { PostMetadataService } from "./post.metadata.service";

@Module({
    imports: [],
    controllers: [PostMetadataController],
    providers: [PostMetadataRepository, PostMetadataService],
    exports: [PostMetadataRepository],
})
export class PostMetadataModule {}
