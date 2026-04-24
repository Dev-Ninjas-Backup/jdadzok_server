import { GetUser, GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { handleRequest } from "@common/utils/handle.request.util";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { CommunitiesService } from "./communities.service";
import { CreateCommunityDto, UpdateCommunityDto } from "./dto/communities.dto";
import { VerifiedUser } from "@type/shared.types";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("communities")
export class CommunitiesController {
    constructor(private readonly service: CommunitiesService) {}

    @Post("/")
    @ApiOperation({ summary: "Create new community" })
    async createCommunity(@GetUser("userId") userId: string, @Body() dto: CreateCommunityDto) {
        return handleRequest(
            () => this.service.createCommunity(userId, dto),
            "Community created successfully",
        );
    }

    // find all data...
    @Get("/")
    @ApiOperation({ summary: "Get All community" })
    async findAll() {
        return handleRequest(() => this.service.findAll(), "Get All Community");
    }

    @Get("myCommunity")
    myNgo(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.service.myCommunity(user.id),
            "Retrive my all community successfully",
        );
    }

    //get single community by ID

    @Get(":communityId")
    @ApiOperation({ summary: "Get Community by id" })
    async findOne(@Param("communityId") communityId: string) {
        return handleRequest(
            () => this.service.findOne(communityId),
            "Get Single Community Successfull",
        );
    }

    //    delete community...
    @Delete(":communityId")
    @ApiOperation({ summary: "Delete Community" })
    async deleteCommunity(
        @GetUser("userId") userId: string,
        @Param("communityId") communityId: string,
    ) {
        return handleRequest(
            () => this.service.deleteCommunity(userId, communityId),
            "Community Delete Successfull",
        );
    }

    // update community...
    @Patch(":communityId")
    @ApiOperation({ summary: "Edit Commuity" })
    async updateComunity(
        @GetUser("userId") userId: string,
        @Param("communityId") communityId: string,
        @Body() dto: UpdateCommunityDto,
    ) {
        return handleRequest(
            () => this.service.updateCommunity(userId, communityId, dto),
            "Community Edit Successfull",
        );
    }

    // user----community followers.

    @Post(":communityId/follow")
    userFollowCommunity(
        @GetUser("userId") userId: string,
        @Param("communityId") communityId: string,
    ) {
        return handleRequest(
            () => this.service.userFollowCommunity(userId, communityId),
            "User Following a Community Successfull",
        );
    }

    @Delete(":communityId/unFollow")
    userUnfollowCommunity(
        @GetUser("userId") userId: string,
        @Param("communityId") communityId: string,
    ) {
        return handleRequest(
            () => this.service.userUnfollowCommunity(userId, communityId),
            "User Following a Community Successfull",
        );
    }

    @Post(":communityId/like")
    @ApiOperation({ summary: "Like a community" })
    async likeCommunity(
        @GetUser("userId") userId: string,
        @Param("communityId") communityId: string,
    ) {
        return handleRequest(
            () => this.service.likeCommunity(userId, communityId),
            "Likes Successfull",
        );
    }

    @Delete(":communityId/unlike")
    @ApiOperation({ summary: "Unlike a community" })
    async unlikeCommunity(
        @GetUser("userId") userId: string,
        @Param("communityId") communityId: string,
    ) {
        return handleRequest(
            () => this.service.unlikeCommunity(userId, communityId),
            "Unlikes Successfully",
        );
    }

    // ----- COUNTS -----
    @Get(":communityId/counts")
    @ApiOperation({ summary: "Get followers and likes count of a community" })
    async getCommunityCounts(@Param("communityId") communityId: string) {
        return handleRequest(
            () => this.service.getCommunityCounts(communityId),
            "Get Count Likes and Followers Successfully",
        );
    }
}
