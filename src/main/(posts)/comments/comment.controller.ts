import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { VerifiedUser } from "@type/index";
import { CommentService } from "./comment.service";
import { CreateCommentDto } from "./dto/create.comment.dto";

@ApiBearerAuth()
@ApiTags("comments")
@Controller("comments")
export class CommentController {
    constructor(private readonly commentService: CommentService) {}

    @ApiOperation({ summary: "Create a comment" })
    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@GetVerifiedUser() user: VerifiedUser, @Body() dto: CreateCommentDto) {
        try {
            return await this.commentService.createComment({
                ...dto,
                authorId: user.id,
            });
        } catch (err) {
            return err;
        }
    }

    @ApiOperation({ summary: "Get comments for a post. give post ID" })
    @Get(":id")
    @UseGuards(JwtAuthGuard)
    async getComments(@Param("id", ParseUUIDPipe) id: string) {
        try {
            return this.commentService.getCommentsForPost(id);
        } catch (err) {
            return err;
        }
    }

    @ApiOperation({ summary: "Delete a comment. give comment ID" })
    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    async delete(@Param("id", ParseUUIDPipe) id: string) {
        try {
            return this.commentService.deleteComment(id);
        } catch (err) {
            return err;
        }
    }
}
