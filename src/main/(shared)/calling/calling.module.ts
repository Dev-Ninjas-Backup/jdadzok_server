// src/call/call.module.ts
import { Module } from "@nestjs/common";

import { PrismaModule } from "@lib/prisma/prisma.module";
import { MentorshipLinkModule } from "@lib/mentorship-link/mentorship-link.module";
import { FriendRequestModule } from "@module/(users)/friend-request/friend-request.module";
import { NotificaitonsModule } from "@module/(shared)/notifications/notifications.module";
import { VolunteerModule } from "@module/volunteer/volunteer.module";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { CallGateway } from "./calling.gateway";
import { CallController } from "./controller/calling.controller";
import { IceService } from "./ice/ice.service";
import { CallService } from "./service/calling.service";
import { MentorshipCallHoursService } from "./service/mentorship-call-hours.service";

@Module({
    imports: [
        PrismaModule,
        FriendRequestModule,
        NotificaitonsModule,
        MentorshipLinkModule,
        VolunteerModule,
        CacheModule.register({
            ttl: 0,
            max: 1000,
        }),
    ],
    providers: [
        CallGateway,
        CallService,
        IceService,
        MentorshipCallHoursService,
        JwtService,
        ConfigService,
    ],
    controllers: [CallController],
    exports: [CallService, MentorshipCallHoursService],
})
export class CallModule {}
