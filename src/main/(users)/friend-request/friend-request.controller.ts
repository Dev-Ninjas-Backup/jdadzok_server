import { Controller, Post, Body, Get, Patch, UseGuards, Delete, Query } from "@nestjs/common";
import { FriendRequestService } from "./friend-request.service";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { handleRequest } from "@common/utils/handle.request.util";
import { FriendRequestAction, RespondRequestDto, SendRequestDto } from "./dto/friend-request.dto";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { VerifiedUser } from "@type/shared.types";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags("Friend Request")
@Controller("friend-request")
export class FriendRequestController {
    constructor(private service: FriendRequestService) {}

    @Post("/")
    @ApiOperation({ summary: "Send friend request" })
    async send(@Body() dto: SendRequestDto, @GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.service.sendRequest(user.id, dto.receiverId),
            "Friend request sent successfully",
        );
    }

    @Delete("/cancel")
    @ApiOperation({ summary: "Cancel a friend request sent by you to a user" })
    @ApiQuery({ name: "receiverId", required: true, example: "user-uuid" })
    async cancelRequest(@GetVerifiedUser() user: any, @Query("receiverId") receiverId: string) {
        return handleRequest(
            () => this.service.cancelRequestByReceiver(user.id, receiverId),
            "Friend request cancelled successfully",
        );
    }

    @Patch("/")
    @ApiOperation({ summary: "Accept or reject friend request" })
    async respond(@Body() dto: RespondRequestDto, @GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.service.respondRequest(dto.requestId, user.id, dto.action),
            dto.action === FriendRequestAction.ACCEPT
                ? "Friend request accepted"
                : "Friend request rejected",
        );
    }

    @Get("/pending")
    @ApiOperation({ summary: "Get pending friend requests" })
    async pending(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.service.getPendingRequests(user.id),
            "Pending friend requests loaded",
        );
    }

    @Get("/non-friends")
    @ApiOperation({ summary: "Get all users who are NOT friends or pending requests" })
    async getNonFriends(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.service.getNonFriends(user.id),
            "Non-friends loaded successfully",
        );
    }

    @Get("/friends")
    @ApiOperation({ summary: "Get all friends of current user" })
    async getFriends(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(() => this.service.getFriends(user.id), "Friends loaded successfully");
    }
}
