import { Module } from "@nestjs/common";
import { ChatModule } from "@module/(sockets)/chats/chats.module";
import { VolunteerService } from "./volunteer.service";
import { VolunteerController } from "./volunteer.controller";
import { VolunteerHourEndorsementService } from "./volunteer-hour-endorsement.service";
import { VolunteerHourCounterpartyService } from "./volunteer-hour-counterparty.service";
import { VolunteerHoursBankService } from "./volunteer-hours-bank.service";
import { PrismaService } from "@lib/prisma/prisma.service";
import { SearchModule } from "@module/(search)/search.module";

@Module({
    imports: [ChatModule, SearchModule],
    controllers: [VolunteerController],
    providers: [
        VolunteerService,
        VolunteerHourEndorsementService,
        VolunteerHourCounterpartyService,
        VolunteerHoursBankService,
        PrismaService,
    ],
    exports: [
        VolunteerHourEndorsementService,
        VolunteerHourCounterpartyService,
        VolunteerHoursBankService,
    ],
})
export class VolunteerModule {}
