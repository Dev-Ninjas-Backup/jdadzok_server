import { Module } from "@nestjs/common";
import { CommentModule } from "./comments/comment.module";
import { GifModule } from "./gif/gif.module";
import { LikeModule } from "./likes/likes.module";
import { LocationModule } from "./locations/locations.module";
import { CategoryModule } from "./post-category/category.module";
import { PostMetadataModule } from "./post-metadata/post.metadata.module";
import { PostModule } from "./posts/posts.module";
import { ShareModule } from "./share/share.module";
import { PostFeaturedModule } from "./post-featured/post.featured.module";

@Module({
    imports: [
        PostModule,
        CategoryModule,
        PostMetadataModule,
        GifModule,
        LocationModule,
        LikeModule,
        CommentModule,
        ShareModule,
        PostFeaturedModule,
    ],
    controllers: [],
    providers: [],
    exports: [],
})
export class PostsGroupModule {}
