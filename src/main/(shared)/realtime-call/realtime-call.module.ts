import { Module } from "@nestjs/common";
import { RealTimeCallGateway } from "./realtime-call.gateway";
import { RealTimeCallService } from "./realtime-call.service";
import { RealTimeCallController } from "./realtime-call.controller";
import { PrismaService } from "@lib/prisma/prisma.service";

@Module({
    controllers: [RealTimeCallController],
    providers: [RealTimeCallGateway, RealTimeCallService, PrismaService],
})
export class RealTimeCallModule {}
