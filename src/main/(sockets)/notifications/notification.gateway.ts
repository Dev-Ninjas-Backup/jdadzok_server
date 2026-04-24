import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
} from "@nestjs/websockets";
import { Socket } from "socket.io";
import { NotificationEvent } from "../@types";
import { BaseSocketGateway } from "../base/abstract-socket.gateway";
import { SOCKET_EVENTS } from "../constants/socket-events.constant";

@WebSocketGateway()
export class NotificationGateway extends BaseSocketGateway {
    @SubscribeMessage(SOCKET_EVENTS.NOTIFICATION.SEND)
    async handleSendNotification(
        @ConnectedSocket() client: Socket,
        @MessageBody()
        data: Omit<NotificationEvent, "eventId" | "timestamp" | "userId"> & {
            targetUserId: string;
        },
    ) {
        console.info(data, client.id);
        // const userId = this.getUserId(client.id);
        // if (!userId) return;
        // const notification: NotificationEvent = {
        //     ...data,
        //     eventId: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        //     timestamp: new Date(),
        //     userId,
        //     read: false,
        // };
        // // Send notification to target user
        // const sent = this.emitToUser(
        //     data.targetUserId,
        //     SOCKET_EVENTS.NOTIFICATION.SEND,
        //     notification,
        // );
        // if (sent) {
        //     client.emit(SOCKET_EVENTS.NOTIFICATION.SEND, this.createResponse(true, { sent: true }));
        //     this.logger.log(`Notification sent from ${userId} to ${data.targetUserId}`);
        // } else {
        //     client.emit(
        //         SOCKET_EVENTS.ERROR.VALIDATION,
        //         this.createResponse(false, null, "Target user not found or offline"),
        //     );
        // }
    }

    @SubscribeMessage(SOCKET_EVENTS.NOTIFICATION.READ)
    async handleMarkNotificationRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { notificationId: string },
    ) {
        console.info(client.id, data);
        // const userId = this.getUserId(client.id);
        // if (!userId) return;
        // // In a real app, you'd update the database here
        // client.emit(
        //     SOCKET_EVENTS.NOTIFICATION.READ,
        //     this.createResponse(true, {
        //         notificationId: data.notificationId,
        //         read: true,
        //     }),
        // );
    }

    protected setupRedis(): void {
        this.logger.log("Setting up Redis for notification gateway");
    }
}
