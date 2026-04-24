import { PrismaService } from "@lib/prisma/prisma.service";
import { Module } from "@nestjs/common";
import { HideController } from "./hide.controller";
import { HideService } from "./hide.service";

@Module({
    controllers: [HideController],
    providers: [HideService, PrismaService],
})
export class HideModule {}
