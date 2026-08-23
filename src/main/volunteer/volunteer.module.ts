import { Module } from "@nestjs/common";
import { VolunteerService } from "./volunteer.service";
import { VolunteerController } from "./volunteer.controller";
import { VolunteerHourEndorsementService } from "./volunteer-hour-endorsement.service";
import { VolunteerHourCounterpartyService } from "./volunteer-hour-counterparty.service";
import { PrismaService } from "@lib/prisma/prisma.service";

@Module({
    controllers: [VolunteerController],
    providers: [
        VolunteerService,
        VolunteerHourEndorsementService,
        VolunteerHourCounterpartyService,
        PrismaService,
    ],
    exports: [VolunteerHourEndorsementService, VolunteerHourCounterpartyService],
})
export class VolunteerModule {}
