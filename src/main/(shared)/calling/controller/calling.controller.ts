// src/call/controller/call.controller.ts
import { GetUser, ValidateAuth } from "@common/jwt/jwt.decorator";
import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Post,
    UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CallGateway } from "../calling.gateway";
import {
    AcceptCallDto,
    CancelCallDto,
    DeclineCallDto,
    StartCallToUserDto,
} from "../dto/calling.dto";
import { CallService } from "../service/calling.service";

@Controller("calls")
@ApiTags("calls-audio-video")
export class CallController {
    constructor(
        private readonly callService: CallService,
        private readonly callGateway: CallGateway,
    ) {}

    /**
     * Start a one-to-one call to another user
     */
    @Post("start")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Start a 1-on-1 call to another user" })
    async startCallToUser(@GetUser("userId") callerId: string, @Body() dto: StartCallToUserDto) {
        return this.callService.startCallToUser(
            callerId,
            dto.recipientUserId,
            "http-request",
            this.callGateway,
        );
    }

    /**
      Accept an incoming call
     */
    @Post("accept")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Accept an incoming call" })
    async acceptCall(@GetUser("userId") userId: string, @Body() dto: AcceptCallDto) {
        const room = await this.callService.acceptCall(dto.callId, userId);
        return {
            callId: room.callId,
            status: room.status,
            hostUserId: room.hostUserId,
            recipientUserId: room.recipientUserId,
        };
    }

    /**
      Decline an incoming call
     */
    @Post("decline")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Decline an incoming call" })
    async declineCall(@GetUser("userId") userId: string, @Body() dto: DeclineCallDto) {
        await this.callService.declineCall(dto.callId, userId);
        return { success: true, message: "Call declined" };
    }

    /**
      Cancel an outgoing call (before it's answered)
     */
    @Post("cancel")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Cancel an outgoing call" })
    async cancelCall(@GetUser("userId") userId: string, @Body() dto: CancelCallDto) {
        await this.callService.cancelCall(dto.callId, userId);
        return { success: true, message: "Call cancelled" };
    }

    /**
      Get call details by ID
     */
    @ValidateAuth()
    @ApiBearerAuth()
    @Get(":id")
    @ApiOperation({ summary: "Get call details" })
    async getCall(@Param("id") id: string, @GetUser("userId") userId: string) {
        const call = await this.callService.getCallById(id);
        if (!call) {
            throw new NotFoundException("Call not found");
        }

        // Verify user is part of the call
        const room = await this.callService.getCallRoom(id);
        if (room) {
            if (room.hostUserId !== userId && room.recipientUserId !== userId) {
                throw new ForbiddenException("You are not part of this call");
            }
        }

        return call;
    }

    /**
      Get active participants in a call room
     */
    @ValidateAuth()
    @ApiBearerAuth()
    @Get(":id/room")
    @ApiOperation({ summary: "Get active participants in call room" })
    async getCallRoom(@Param("id") id: string, @GetUser("userId") userId: string) {
        const room = await this.callService.getCallRoom(id);

        if (!room) {
            return {
                callId: id,
                participants: [],
                active: false,
            };
        }

        // Verify user is part of the call
        if (room.hostUserId !== userId && room.recipientUserId !== userId) {
            throw new ForbiddenException("You are not part of this call");
        }

        return {
            callId: room.callId,
            status: room.status,
            hostUserId: room.hostUserId,
            recipientUserId: room.recipientUserId,
            participants: room.participants.map((p) => ({
                socketId: p.socketId,
                userId: p.userId,
                userName: p.userName,
                hasVideo: p.hasVideo,
                hasAudio: p.hasAudio,
                joinedAt: p.joinedAt,
            })),
            active: true,
            participantCount: room.participants.length,
        };
    }

    /**
     * Get call history for the authenticated user
     */
    @ValidateAuth()
    @ApiBearerAuth()
    @Get("user/history")
    @ApiOperation({ summary: "Get call history" })
    async getCallHistory(@GetUser("userId") userId: string) {
        if (!userId) {
            throw new UnauthorizedException("User ID is required");
        }
        return await this.callService.getCallHistory(userId);
    }

    /**
     * Get current active call for user
     */
    @ValidateAuth()
    @ApiBearerAuth()
    @Get("user/current")
    @ApiOperation({ summary: "Get user's current active call" })
    async getCurrentCall(@GetUser("userId") userId: string) {
        const callId = await this.callService.getUserCurrentCall(userId);

        if (!callId) {
            return { hasActiveCall: false, callId: null };
        }

        const room = await this.callService.getCallRoom(callId);
        return {
            hasActiveCall: true,
            callId,
            status: room?.status,
            participants: room?.participants || [],
        };
    }

    /**
      End a call (host or participant can end)
     */
    @ValidateAuth()
    @ApiBearerAuth()
    @Delete(":id")
    @ApiOperation({ summary: "End a call" })
    async endCall(@Param("id") id: string, @GetUser("userId") userId: string) {
        if (!userId) {
            throw new UnauthorizedException("User ID is required");
        }

        const room = await this.callService.getCallRoom(id);
        if (!room) {
            throw new NotFoundException("Call not found");
        }

        // Verify user is part of the call
        if (room.hostUserId !== userId && room.recipientUserId !== userId) {
            throw new ForbiddenException("You are not part of this call");
        }

        await this.callService.endCall(id);

        return {
            success: true,
            message: "Call ended",
        };
    }
}
