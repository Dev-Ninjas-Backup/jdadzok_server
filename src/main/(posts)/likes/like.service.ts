import { Injectable } from "@nestjs/common";
import { CreateLikeDto } from "./dto/creaete.like.dto";
import { LikeRepository } from "./like.repository";

@Injectable()
export class LikeService {
    constructor(private readonly likeRepository: LikeRepository) {}

    async likePost(userId: string, dto: CreateLikeDto) {
        // check if already liked or not
        const exist = await this.likeRepository.alreadyLiked(userId, dto.postId, dto?.commentId);
        // if already liked then we have have to dislike that
        if (exist) return await this.likeRepository.removeLike(userId, dto.postId, dto?.commentId);

        // if not then create like
        return await this.likeRepository.like({ ...dto, userId });
    }

    async getPostLikes(postId: string) {
        return await this.likeRepository.getLikesForPost(postId);
    }
}
