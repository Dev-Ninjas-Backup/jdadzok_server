import { PrismaModule } from "@lib/prisma/prisma.module";
import { Module } from "@nestjs/common";
import { MentorshipLinkService } from "./mentorship-link.service";

@Module({
    imports: [PrismaModule],
    providers: [MentorshipLinkService],
    exports: [MentorshipLinkService],
})
export class MentorshipLinkModule {}
