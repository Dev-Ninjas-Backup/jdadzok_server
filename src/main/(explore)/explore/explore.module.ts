import { Module } from "@nestjs/common";
import { ExploreController } from "./explore.controller";
import { PrismaService } from "@lib/prisma/prisma.service";
import { ExploreService } from "./explore.service";

@Module({
    controllers: [ExploreController],
    providers: [ExploreService, PrismaService],
})
export class ExploreModule {}
