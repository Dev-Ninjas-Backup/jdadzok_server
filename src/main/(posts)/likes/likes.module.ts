import { Module } from "@nestjs/common";
import { LikeController } from "./like.controller";
import { LikeRepository } from "./like.repository";
import { LikeService } from "./like.service";

@Module({
    imports: [],
    controllers: [LikeController],
    providers: [LikeRepository, LikeService],
    exports: [LikeRepository],
})
export class LikeModule {}
