import { AuthValidatorService } from "@global/auth-validator/auth-validator.service";
import { HelperFunctions } from "@module/(core)/feeds/functions/helper";
import { PostsMetricsRepository } from "@module/(metrics)/posts-metrics/posts-metrics.repository";
import { UserProfileRepository } from "@module/(users)/user-profile/user.profile.repository";
import { UserRepository } from "@module/(users)/users/users.repository";
import { Module } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { S3Service } from "@s3/s3.service";
import { JwtServices } from "@service/jwt.service";
import { GifRepository } from "../gif/gif.repository";
import { LocationRepository } from "../locations/locations.repository";
import { PostMetadataRepository } from "../post-metadata/post.metadata.repository";
import { PostTagsRepository } from "../post-tags/post-tags.repository";
import { PostGateway } from "./getway/posts.gateway";
import { PostController } from "./posts.controller";
import { PostRepository } from "./posts.repository";
import { PostService } from "./posts.service";
import { PostUtils } from "./utils";
import { FollowModule } from "@module/(users)/follow/follow.module";

@Module({
    imports: [FollowModule],
    controllers: [PostController],
    providers: [
        JwtService,
        UserProfileRepository,
        UserRepository,
        JwtServices,
        AuthValidatorService,
        PostService,
        PostRepository,
        PostTagsRepository,
        LocationRepository,
        GifRepository,
        PostMetadataRepository,
        UserRepository,
        PostGateway,
        S3Service,
        PostUtils,
        PostsMetricsRepository,
        HelperFunctions,
    ],
    exports: [PostRepository],
})
export class PostModule {}
