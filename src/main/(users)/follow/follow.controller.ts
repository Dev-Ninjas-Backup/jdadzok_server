import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/index";
import { CreateFollowDto } from "./dto/create-follow.dto";
import { FollowService } from "./follow.service";

@ApiBearerAuth()
@ApiTags("follows")
@Controller("follows")
@UseGuards(JwtAuthGuard)
export class FollowController {
    constructor(private readonly followService: FollowService) {}

    @ApiOperation({ summary: "Follow or unfollow a user" })
    @Post()
    async toggleFollow(@GetVerifiedUser() user: VerifiedUser, @Body() dto: CreateFollowDto) {
        return await this.followService.toggleFollow(user.id, dto);
    }

    @ApiOperation({ summary: "Get followers of a user" })
    @Get(":userId/followers")
    async getFollowers(@Param("userId") userId: string) {
        return await this.followService.getFollowers(userId);
    }

    @ApiOperation({ summary: "Get users followed by a user" })
    @Get(":userId/following")
    async getFollowing(@Param("userId") userId: string) {
        return await this.followService.getFollowing(userId);
    }

    @ApiOperation({ summary: "Check if current user follows another" })
    @Get(":userId/is-following")
    async isFollowing(@GetVerifiedUser() user: VerifiedUser, @Param("userId") userId: string) {
        return await this.followService.isFollowing(user.id, userId);
    }
}
