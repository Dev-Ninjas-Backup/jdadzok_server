import { Module } from "@nestjs/common";
import { VolunteerService } from "./volunteer.service";
import { VolunteerController } from "./volunteer.controller";
import { PrismaService } from "@lib/prisma/prisma.service";

@Module({
    controllers: [VolunteerController],
    providers: [VolunteerService, PrismaService],
})
export class VolunteerModule {}
