import { Module } from "@nestjs/common";
import { NotificaitonsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
    imports: [],
    controllers: [NotificaitonsController],
    providers: [NotificationsService],
    exports: [],
})
export class NotificaitonsModule {}
