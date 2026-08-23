import { Module } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { CorporateController } from "./corporate.controller";
import { SponsoredController } from "./sponsored.controller";
import { CorporateService } from "./corporate.service";
import { SponsoredOpportunityService } from "./sponsored-opportunity.service";

@Module({
    controllers: [CorporateController, SponsoredController],
    providers: [CorporateService, SponsoredOpportunityService, PrismaService],
    exports: [CorporateService, SponsoredOpportunityService],
})
export class CorporateModule {}
