import { Module } from "@nestjs/common";

import { CallModule } from "./calling/calling.module";
import { NotificaitonsModule } from "./notifications/notifications.module";
import { RealTimeCallModule } from "./realtime-call/realtime-call.module";

@Module({
    imports: [NotificaitonsModule, CallModule, RealTimeCallModule],
    controllers: [],
    providers: [],
    exports: [NotificaitonsModule, CallModule, RealTimeCallModule],
})
export class SharedGroupModule {}
