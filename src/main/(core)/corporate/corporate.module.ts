import { Module } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { CorporateController } from "./corporate.controller";
import { CorporateService } from "./corporate.service";

@Module({
    controllers: [CorporateController],
    providers: [CorporateService, PrismaService],
    exports: [CorporateService],
})
export class CorporateModule {}
