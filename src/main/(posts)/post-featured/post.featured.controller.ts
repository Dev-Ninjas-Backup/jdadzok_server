import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { PostFeaturedService } from "./post.featured.service";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/shared.types";
import { SavePostDto } from "./dto/save.post.dto";
import { handleRequest } from "@common/utils/handle.request.util";
import { TogglePostDto } from "./dto/toggle.post.dto";

@Controller("post-featured")
@ApiBearerAuth()
export class PostFeaturedController {
    constructor(private service: PostFeaturedService) {}

    @Post("/save")
    @ApiOperation({ summary: "Save a post" })
    async save(@GetVerifiedUser() user: VerifiedUser, @Body() dto: SavePostDto) {
        return handleRequest(
            () => this.service.savePost(user.id, dto.postId),
            "Post saved successfully",
        );
    }

    @Delete("/unsave")
    @ApiOperation({ summary: "Unsave a post" })
    async unsave(@GetVerifiedUser() user: VerifiedUser, @Body() dto: SavePostDto) {
        return handleRequest(
            () => this.service.unsavePost(user.id, dto.postId),
            "Post unsaved successfully",
        );
    }

    @Get("status/:postId")
    @ApiOperation({ summary: "Check if post is saved" })
    async checkSaved(@GetVerifiedUser() user: VerifiedUser, @Param("postId") postId: string) {
        return handleRequest(() => this.service.isSaved(user.id, postId), "Saved status fetched");
    }

    @Get("my")
    @ApiOperation({ summary: "Get all saved posts of the user" })
    async mySaved(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.service.getMySavedPosts(user.id),
            "Saved posts fetched successfully",
        );
    }

    // hide post
    @Patch("toggle-hide/:postId")
    @ApiOperation({ summary: "Toggle hide/unhide of a post" })
    async toggleHide(
        @GetVerifiedUser() user: VerifiedUser,
        @Param("postId") postId: string,
        @Body() dto: TogglePostDto,
    ) {
        return handleRequest(
            () => this.service.togglePostHide(user.id, postId, dto),
            "Post hide status updated successfully",
        );
    }

    @Get("hidden")
    @ApiOperation({ summary: "Get all hidden posts of the user" })
    async getHidden(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.service.getMyHiddenPosts(user.id),
            "Hidden posts fetched successfully",
        );
    }
}
