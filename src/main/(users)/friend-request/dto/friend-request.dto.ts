import { ApiProperty } from "@nestjs/swagger";
import { IsUUID, IsString, IsEnum } from "class-validator";

export class SendRequestDto {
    @ApiProperty({
        description: "The ID of the user to send a friend request to",
        example: "1b2f4c7d-3e16-4e91-9f2b-5adccf229f88",
    })
    @IsUUID()
    @IsString()
    receiverId: string;
}

export enum FriendRequestAction {
    ACCEPT = "ACCEPT",
    REJECT = "REJECT",
}

export class RespondRequestDto {
    @ApiProperty({
        description: "The friend request ID",
        example: "92bc2a63-2bed-4ea8-8e3b-d2a8f457110b",
    })
    @IsUUID()
    requestId: string;

    @ApiProperty({
        description: "Action to perform: ACCEPT or REJECT",
        enum: FriendRequestAction,
        example: FriendRequestAction.ACCEPT,
    })
    @IsEnum(FriendRequestAction)
    action: FriendRequestAction;
}
