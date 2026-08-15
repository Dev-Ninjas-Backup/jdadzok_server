import { Module } from "@nestjs/common";
import { RealTimeCallGateway } from "./realtime-call.gateway";
import { RealTimeCallService } from "./realtime-call.service";
import { RealTimeCallController } from "./realtime-call.controller";
import { PrismaService } from "@lib/prisma/prisma.service";
import { CallModule } from "../calling/calling.module";

@Module({
    imports: [CallModule],
    controllers: [RealTimeCallController],
    providers: [RealTimeCallGateway, RealTimeCallService, PrismaService],
})
export class RealTimeCallModule {}
