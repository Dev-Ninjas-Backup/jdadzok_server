import { Module } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { UserProfileModule } from "@module/(users)/user-profile/user.profile.module";
import { CorporateController } from "./corporate.controller";
import { SponsoredController } from "./sponsored.controller";
import { TalentController } from "./talent.controller";
import { CorporateService } from "./corporate.service";
import { SponsoredOpportunityService } from "./sponsored-opportunity.service";
import { TalentSourcingService } from "./talent-sourcing.service";

@Module({
    imports: [UserProfileModule],
    controllers: [CorporateController, SponsoredController, TalentController],
    providers: [
        CorporateService,
        SponsoredOpportunityService,
        TalentSourcingService,
        PrismaService,
    ],
    exports: [CorporateService, SponsoredOpportunityService, TalentSourcingService],
})
export class CorporateModule {}
