// src/call/dto/calling.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

export class JoinCallDto {
    @ApiProperty({ description: "Call ID" })
    @IsString()
    @IsNotEmpty()
    callId: string;

    @ApiProperty({ description: "User name" })
    @IsString()
    @IsNotEmpty()
    userName: string;

    @ApiProperty({ description: "Has video enabled" })
    @IsBoolean()
    @IsOptional()
    hasVideo?: boolean;

    @ApiProperty({ description: "Has audio enabled" })
    @IsBoolean()
    @IsOptional()
    hasAudio?: boolean;
}

export class StartMediaDto {
    @ApiProperty({ description: "Call ID" })
    @IsString()
    @IsNotEmpty()
    callId: string;
}

export class WebRTCSignalDto {
    @ApiProperty({ description: "Target socket ID" })
    @IsString()
    @IsNotEmpty()
    targetSocketId: string;

    @ApiProperty({ description: "WebRTC signal data (SDP)" })
    @IsObject()
    signal: any;
}

export class IceCandidateDto {
    @ApiProperty({ description: "Target socket ID" })
    @IsString()
    @IsNotEmpty()
    targetSocketId: string;

    @ApiProperty({ description: "ICE candidate" })
    @IsObject()
    candidate: any;
}

export class StartCallToUserDto {
    @ApiProperty({
        description: "ID of the user to call",
        example: "123e4567-e89b-12d3-a456-426614174000",
    })
    @IsString()
    @IsNotEmpty()
    recipientUserId: string;
}

export class AcceptCallDto {
    @ApiProperty({ description: "Call ID to accept" })
    @IsString()
    @IsNotEmpty()
    callId: string;
}

export class DeclineCallDto {
    @ApiProperty({ description: "Call ID to decline" })
    @IsString()
    @IsNotEmpty()
    callId: string;
}

export class CancelCallDto {
    @ApiProperty({ description: "Call ID to cancel" })
    @IsString()
    @IsNotEmpty()
    callId: string;
}

export class ToggleMediaDto {
    @ApiProperty({ description: "Call ID" })
    @IsString()
    @IsNotEmpty()
    callId: string;

    @ApiProperty({ description: "Media enabled state" })
    @IsBoolean()
    @IsNotEmpty()
    enabled: boolean;
}
