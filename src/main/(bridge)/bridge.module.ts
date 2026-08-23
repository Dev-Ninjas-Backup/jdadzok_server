import { Module } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { ChatModule } from "@module/(sockets)/chats/chats.module";
import { BridgeController } from "./bridge.controller";
import { BridgeService } from "./bridge.service";

/**
 * The Bridge — skills & opportunity exchange.
 * Intentionally separate from `(marketplace)` goods Product/Order commerce.
 */
@Module({
    imports: [ChatModule],
    controllers: [BridgeController],
    providers: [BridgeService, PrismaService],
    exports: [BridgeService],
})
export class BridgeModule {}
