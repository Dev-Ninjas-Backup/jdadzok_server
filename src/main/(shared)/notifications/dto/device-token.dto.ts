import { ApiProperty } from "@nestjs/swagger";
import { DevicePlatform } from "@prisma/client";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";

export class RegisterDeviceTokenDto {
    @ApiProperty({ description: "FCM or APNs device token" })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({ enum: DevicePlatform, example: DevicePlatform.IOS })
    @IsEnum(DevicePlatform)
    platform: DevicePlatform;
}

export class UnregisterDeviceTokenDto {
    @ApiProperty({ description: "FCM or APNs device token to remove" })
    @IsString()
    @IsNotEmpty()
    token: string;
}
