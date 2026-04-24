import { GetUser, GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { handleRequest } from "@common/utils/handle.request.util";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { CreateNgoDto, UpdateNgoDto } from "./dto/ngo.dto";
import { NgoService } from "./ngo.service";
import { VerifiedUser } from "@type/shared.types";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("ngos")
export class NgoController {
    constructor(private readonly service: NgoService) {}
    // create new ngo.....
    @Post("/")
    @ApiOperation({ summary: "Create new ngo" })
    async createCommunity(@GetUser("userId") userId: string, @Body() dto: CreateNgoDto) {
        return handleRequest(() => this.service.createNgo(userId, dto), "Ngo created successfully");
    }

    // find all ngo...
    @Get("")
    @ApiOperation({ summary: "Get All community" })
    async findAll() {
        return handleRequest(() => this.service.findAll(), "Get All Ngo");
    }

    @Get("myNgo")
    myNgo(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(() => this.service.myNgo(user.id), "Retrive my all ngo successfully");
    }

    //    delete Ngo...
    @Delete(":ngoId")
    @ApiOperation({ summary: "Delete Ngo" })
    async deleteCommunity(@GetUser("userId") userId: string, @Param("ngoId") communityId: string) {
        return handleRequest(
            () => this.service.deleteNgo(userId, communityId),
            "Ngo Delete Successfull",
        );
    }

    // update community...
    @Patch(":ngoId")
    @ApiOperation({ summary: "Edit Ngo" })
    async updateComunity(
        @GetUser("userId") userId: string,
        @Param("ngoId") communityId: string,
        @Body() dto: UpdateNgoDto,
    ) {
        return handleRequest(
            () => this.service.updateNgo(userId, communityId, dto),
            "Ngo Edit Successfull",
        );
    }

    // find one ngo
    @Get(":ngoId")
    @ApiOperation({ summary: "Get Ngo by id" })
    async findOne(@Param("ngoId") ngoId: string) {
        return handleRequest(() => this.service.findOne(ngoId), "Get Single Ngo Successfull");
    }

    // Ngo Follow
    @Post(":ngoId/follow")
    @ApiOperation({ summary: "Following Ngo" })
    async followNgo(@GetUser("userId") userId: string, @Param("ngoId") ngoId: string) {
        return handleRequest(() => this.service.followNgo(userId, ngoId), "Followed successfully");
    }

    // Ngo Unfollow
    @Delete(":ngoId/unfollow")
    @ApiOperation({ summary: "UnFollowing Ngo" })
    async unfollowNgo(@GetUser("userId") userId: string, @Param("ngoId") ngoId: string) {
        return handleRequest(
            () => this.service.unfollowNgo(userId, ngoId),
            "Unfollowed successfully",
        );
    }

    // Ngo Like
    @Post(":ngoId/like")
    @ApiOperation({ summary: "Like an Ngo" })
    async likeNgo(@GetUser("userId") userId: string, @Param("ngoId") ngoId: string) {
        return handleRequest(() => this.service.likeNgo(userId, ngoId), "Like successfully");
    }

    // Ngo unlike
    @Delete(":ngoId/unlike")
    @ApiOperation({ summary: "Unlike an Ngo" })
    async unlikeNgo(@GetUser("userId") userId: string, @Param("ngoId") ngoId: string) {
        return handleRequest(() => this.service.unlikeNgo(userId, ngoId), "Unlike successfully");
    }

    // GET COUNTS Likes and Followers
    @Get(":ngoId/counts")
    @ApiOperation({ summary: "Get followers and likes count of an NGO" })
    async getNgoCounts(@Param("ngoId") ngoId: string) {
        return handleRequest(
            () => this.service.getNgoCounts(ngoId),
            "Get Counts Likes and Followers.",
        );
    }
}
