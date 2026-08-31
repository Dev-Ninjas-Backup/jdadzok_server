import { Module } from "@nestjs/common";
import { NotificaitonsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { PushNotificationService } from "./push-notification.service";

@Module({
    imports: [],
    controllers: [NotificaitonsController],
    providers: [NotificationsService, PushNotificationService],
    exports: [PushNotificationService],
})
export class NotificaitonsModule {}
