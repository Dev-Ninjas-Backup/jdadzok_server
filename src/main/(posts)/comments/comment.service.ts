import { Injectable } from "@nestjs/common";
import { successResponse } from "@common/utils/response.util";
import { CommentRepository } from "./comment.repository";
import { CreateCommentDto } from "./dto/create.comment.dto";
import { UpdateCommentDto } from "./dto/update.comment.dto";

@Injectable()
export class CommentService {
    constructor(private readonly commentRepository: CommentRepository) {}

    async createComment(dto: CreateCommentDto) {
        const result = await this.commentRepository.createComment(dto);
        return successResponse(result, "Comment created successfully");
    }

    async getCommentsForPost(postId: string) {
        const comments = await this.commentRepository.getCommentsForPost(postId);
        return successResponse(comments, "Comments retrieved successfully");
    }

    async updateComment(commentId: string, userId: string, dto: UpdateCommentDto) {
        const updated = await this.commentRepository.updateComment(commentId, userId, dto);
        return successResponse(updated, "Comment updated successfully");
    }

    async deleteComment(commentId: string, userId: string) {
        const result = await this.commentRepository.deleteComment(commentId, userId);
        return successResponse(result, "Comment deleted successfully");
    }
}
