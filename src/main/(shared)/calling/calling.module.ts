// src/call/call.module.ts
import { Module } from "@nestjs/common";

import { PrismaModule } from "@lib/prisma/prisma.module";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { CallGateway } from "./calling.gateway";
import { CallController } from "./controller/calling.controller";
import { CallService } from "./service/calling.service";
import { MentorshipCallHoursService } from "./service/mentorship-call-hours.service";

@Module({
    imports: [
        PrismaModule,
        CacheModule.register({
            ttl: 0,
            max: 1000,
        }),
    ],
    providers: [
        CallGateway,
        CallService,
        MentorshipCallHoursService,
        JwtService,
        ConfigService,
    ],
    controllers: [CallController],
    exports: [CallService, MentorshipCallHoursService],
})
export class CallModule {}
