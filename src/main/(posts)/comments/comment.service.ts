import { Injectable } from "@nestjs/common";
import { CommentRepository } from "./comment.repository";
import { CreateCommentDto } from "./dto/create.comment.dto";

@Injectable()
export class CommentService {
    constructor(private readonly commentRepository: CommentRepository) {}

    async createComment(dto: CreateCommentDto) {
        return await this.commentRepository.createComment(dto);
    }

    async getCommentsForPost(postId: string) {
        return this.commentRepository.getCommentsForPost(postId);
    }

    async deleteComment(commentId: string) {
        return this.commentRepository.deleteComment(commentId);
    }
}
