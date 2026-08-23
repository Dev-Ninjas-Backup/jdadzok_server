import { Module } from "@nestjs/common";
import { VolunteerService } from "./volunteer.service";
import { VolunteerController } from "./volunteer.controller";
import { VolunteerHourEndorsementService } from "./volunteer-hour-endorsement.service";
import { PrismaService } from "@lib/prisma/prisma.service";

@Module({
    controllers: [VolunteerController],
    providers: [VolunteerService, VolunteerHourEndorsementService, PrismaService],
    exports: [VolunteerHourEndorsementService],
})
export class VolunteerModule {}
