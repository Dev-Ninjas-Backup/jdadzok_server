import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/index";
import { ShareService } from "./share.service";
import { CreateShareDto } from "./dto/create.share.dto";

@ApiBearerAuth()
@ApiTags("shares")
@Controller("shares")
@UseGuards(JwtAuthGuard)
export class ShareController {
    constructor(private readonly shareService: ShareService) {}

    @ApiOperation({ summary: "Share or unshare a post" })
    @Post()
    async sharePost(@GetVerifiedUser() user: VerifiedUser, @Body() dto: CreateShareDto) {
        return await this.shareService.sharePost(user.id, dto);
    }

    @ApiOperation({ summary: "Get all shares for a post" })
    @Get("post/:postId")
    async getPostShares(@Param("postId") postId: string) {
        return await this.shareService.getPostShares(postId);
    }

    @ApiOperation({ summary: "Get all posts shared by the logged-in user" })
    @Get("me")
    async getMyShares(@GetVerifiedUser() user: VerifiedUser) {
        return await this.shareService.getUserShares(user.id);
    }
}
