// src/chat/chat.module.ts
import { PrismaService } from "@lib/prisma/prisma.service";
import { AuthModule } from "@module/(started)/auth/auth.module"; // Correct path
import { FriendRequestModule } from "@module/(users)/friend-request/friend-request.module";
import { Module } from "@nestjs/common";
import { ActiveUsersService } from "./active-user.service";
import { ChatController } from "./chat.controller";
import { ChatGateway } from "./chat.gateway";
import { ChatService } from "./chat.service";

@Module({
    imports: [AuthModule, FriendRequestModule],
    providers: [
        ChatService,
        ChatGateway,
        PrismaService,
        ActiveUsersService,
    ],
    controllers: [ChatController],
    exports: [ChatService, ActiveUsersService],
})
export class ChatModule {}
