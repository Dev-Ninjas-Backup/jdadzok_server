import { Module } from "@nestjs/common";
import { CommentController } from "./comment.controller";
import { CommentRepository } from "./comment.repository";
import { CommentService } from "./comment.service";

@Module({
    imports: [],
    controllers: [CommentController],
    providers: [CommentRepository, CommentService],
    exports: [CommentRepository],
})
export class CommentModule {}
