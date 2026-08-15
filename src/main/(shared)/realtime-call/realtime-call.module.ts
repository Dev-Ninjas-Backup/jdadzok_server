import { Module } from "@nestjs/common";
import { RealTimeCallGateway } from "./realtime-call.gateway";
import { RealTimeCallService } from "./realtime-call.service";
import { RealTimeCallController } from "./realtime-call.controller";
import { PrismaService } from "@lib/prisma/prisma.service";
import { CallModule } from "../calling/calling.module";
import { FriendRequestModule } from "@module/(users)/friend-request/friend-request.module";

@Module({
    imports: [CallModule, FriendRequestModule],
    controllers: [RealTimeCallController],
    providers: [RealTimeCallGateway, RealTimeCallService, PrismaService],
})
export class RealTimeCallModule {}
