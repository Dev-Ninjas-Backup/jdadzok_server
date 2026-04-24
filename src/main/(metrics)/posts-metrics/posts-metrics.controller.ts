import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PostsMetricsService } from "./posts-metrics.service";

@ApiBearerAuth()
@ApiTags("Posts Metrics")
@Controller("posts-metrics")
export class PostsMetricsController {
    constructor(private readonly service: PostsMetricsService) {}

    // @Post()
    // @ApiOperation({ summary: "Create post metrics entry" })
    // create(@Body() dto: CreatePostsMetricsDto) {
    //     return this.service.createMetrics(dto);
    // }

    @Get(":postId")
    @ApiOperation({ summary: "Get metrics for a specific post" })
    findOne(@Param("postId") postId: string) {
        return this.service.getMetrics(postId);
    }

    // @Patch(":postId")
    // @ApiOperation({ summary: "Update metrics for a specific post" })
    // update(@Param("postId") postId: string, @Body() dto: UpdatePostsMetricsDto) {
    //     return this.service.updateMetrics(postId, dto);
    // }

    // Increment endpoints for frontend interaction updates
    // @Post(":postId/like")
    // @ApiOperation({ summary: "Increment total likes" })
    // incrementLike(@Param("postId") postId: string) {
    //     return this.service.incrementLike(postId);
    // }

    // @Post(":postId/unlike")
    // @ApiOperation({ summary: "Decrement total likes" })
    // decrementLike(@Param("postId") postId: string) {
    //     return this.service.decrementLike(postId);
    // }

    // @Post(":postId/comment")
    // @ApiOperation({ summary: "Increment total comments" })
    // incrementComment(@Param("postId") postId: string) {
    //     return this.service.incrementComment(postId);
    // }

    // @Post(":postId/share")
    // @ApiOperation({ summary: "Increment total shares" })
    // incrementShare(@Param("postId") postId: string) {
    //     return this.service.incrementShare(postId);
    // }

    // @Post(":postId/view")
    // @ApiOperation({ summary: "Increment total views" })
    // incrementView(@Param("postId") postId: string) {
    //     return this.service.incrementView(postId);
    // }

    // @Delete(":postId")
    // @ApiOperation({ summary: "Delete metrics for a specific post" })
    // delete(@Param("postId") postId: string) {
    //     return this.service.deleteMetrics(postId);
    // }
}
