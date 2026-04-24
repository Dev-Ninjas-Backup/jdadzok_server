import { Module } from "@nestjs/common";
import { FriendRequestService } from "./friend-request.service";
import { FriendRequestController } from "./friend-request.controller";
import { PrismaService } from "@lib/prisma/prisma.service";

@Module({
    controllers: [FriendRequestController],
    providers: [FriendRequestService, PrismaService],
})
export class FriendRequestModule {}
