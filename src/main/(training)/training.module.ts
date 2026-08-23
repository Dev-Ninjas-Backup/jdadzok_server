import { Module } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { TrainingController } from "./training.controller";
import { TrainingService } from "./training.service";

@Module({
    controllers: [TrainingController],
    providers: [TrainingService, PrismaService],
    exports: [TrainingService],
})
export class TrainingModule {}
