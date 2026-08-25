// src/call/dto/calling.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CallPurpose } from "@prisma/client";
import { IsBoolean, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

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

    @ApiPropertyOptional({ description: "Call room id — used as relay fallback" })
    @IsOptional()
    @IsString()
    callId?: string;
}

export class IceCandidateDto {
    @ApiProperty({ description: "Target socket ID" })
    @IsString()
    @IsNotEmpty()
    targetSocketId: string;

    @ApiProperty({ description: "ICE candidate" })
    @IsObject()
    candidate: any;

    @ApiPropertyOptional({ description: "Call room id — used as relay fallback" })
    @IsOptional()
    @IsString()
    callId?: string;
}

export class StartCallToUserDto {
    @ApiProperty({
        description: "ID of the user to call",
        example: "123e4567-e89b-12d3-a456-426614174000",
    })
    @IsString()
    @IsNotEmpty()
    recipientUserId: string;

    @ApiPropertyOptional({
        enum: CallPurpose,
        default: CallPurpose.GENERAL,
        description:
            "GENERAL never counts toward Cap hours. MENTORSHIP auto-logs verified VolunteerHour on call end (requires volunteer/mentor opt-in).",
    })
    @IsOptional()
    @IsEnum(CallPurpose)
    callPurpose?: CallPurpose;

    @ApiPropertyOptional({
        enum: ["audio", "video"],
        default: "audio",
        description: "Whether this is an audio-only or video call",
    })
    @IsOptional()
    @IsString()
    mediaType?: "audio" | "video";
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
