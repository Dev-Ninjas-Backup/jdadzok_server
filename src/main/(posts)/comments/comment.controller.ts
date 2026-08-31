import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { VerifiedUser } from "@type/index";
import { CommentService } from "./comment.service";
import { CreateCommentDto } from "./dto/create.comment.dto";
import { UpdateCommentDto } from "./dto/update.comment.dto";

@ApiBearerAuth()
@ApiTags("comments")
@Controller("comments")
export class CommentController {
    constructor(private readonly commentService: CommentService) {}

    @ApiOperation({ summary: "Create a comment or reply (parentCommentId for replies)" })
    @Post()
    @UseGuards(JwtAuthGuard)
    async create(@GetVerifiedUser() user: VerifiedUser, @Body() dto: CreateCommentDto) {
        return this.commentService.createComment({
            ...dto,
            authorId: user.id,
        });
    }

    @ApiOperation({ summary: "Get comments for a post (give post ID)" })
    @Get(":id")
    @UseGuards(JwtAuthGuard)
    async getComments(@Param("id", ParseUUIDPipe) id: string) {
        return this.commentService.getCommentsForPost(id);
    }

    @ApiOperation({ summary: "Edit a comment (author only)" })
    @Patch(":id")
    @UseGuards(JwtAuthGuard)
    async update(
        @Param("id", ParseUUIDPipe) id: string,
        @GetVerifiedUser() user: VerifiedUser,
        @Body() dto: UpdateCommentDto,
    ) {
        return this.commentService.updateComment(id, user.id, dto);
    }

    @ApiOperation({ summary: "Delete a comment (author only)" })
    @Delete(":id")
    @UseGuards(JwtAuthGuard)
    async delete(@Param("id", ParseUUIDPipe) id: string, @GetVerifiedUser() user: VerifiedUser) {
        return this.commentService.deleteComment(id, user.id);
    }
}
