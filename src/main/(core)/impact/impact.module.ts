import { Module } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { ImpactExportController } from "./impact-export.controller";
import { ImpactExportService } from "./impact-export.service";

@Module({
    controllers: [ImpactExportController],
    providers: [ImpactExportService, PrismaService],
    exports: [ImpactExportService],
})
export class ImpactModule {}
