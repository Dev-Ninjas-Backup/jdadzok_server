import { Module } from "@nestjs/common";
import { ExploreController } from "./explore.controller";
import { GuestExploreController } from "./guest-explore.controller";
import { PrismaService } from "@lib/prisma/prisma.service";
import { ExploreService } from "./explore.service";
import { GuestExploreService } from "./guest-explore.service";

@Module({
    controllers: [ExploreController, GuestExploreController],
    providers: [ExploreService, GuestExploreService, PrismaService],
    exports: [ExploreService, GuestExploreService],
})
export class ExploreModule {}
