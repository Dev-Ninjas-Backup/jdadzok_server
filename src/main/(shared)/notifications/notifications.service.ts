import { HandleError } from "@common/error/handle-error.decorator";
import { successResponse, errorResponse, TResponse } from "@common/utils/response.util";
import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { NotificationToggleDto } from "./dto/notification-toggle";
import { ReadNotificationDto } from "./dto/read.notification.dto";
import { NotificationType } from "@prisma/client";

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) {}

    // ---------Get all notifications (Admin use case)
    @HandleError("Failed to get all notifications")
    async getAllNotification() {
        const notifications = await this.prisma.notification.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        return successResponse(notifications, "All notifications retrieved successfully");
    }

    // ---------Get user-specific notifications with UserNotification join
    @HandleError("Failed to get user notifications")
    async getUserNotifications(userId: string): Promise<TResponse<any>> {
        const notifications = await this.prisma.userNotification.findMany({
            where: { userId },
            include: {
                notification: {
                    select: {
                        id: true,
                        type: true,
                        title: true,
                        message: true,
                        entityId: true,
                        metadata: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        const formattedNotifications = notifications.map((un) => ({
            id: un.id,
            notificationId: un.notificationId,
            read: un.read,
            createdAt: un.createdAt,
            updatedAt: un.updatedAt,
            type: un.notification.type,
            title: un.notification.title,
            message: un.notification.message,
            entityId: un.notification.entityId,
            metadata: un.notification.metadata,
            notificationCreatedAt: un.notification.createdAt,
        }));

        const unreadCount = notifications.filter((n) => !n.read).length;

        return successResponse(
            {
                notifications: formattedNotifications,
                unreadCount,
                total: notifications.length,
            },
            "User notifications retrieved successfully",
        );
    }

    // Mark notification as READ (using Notification model)
    @HandleError("Failed to mark notification as read")
    async markAsRead(dto: ReadNotificationDto, userId: string) {
        // Check if notification exists and belongs to user
        const exists = await this.prisma.notification.findFirst({
            where: {
                id: dto.notificationId,
                userId,
            },
        });

        if (!exists) {
            throw new NotFoundException("Notification not found");
        }

        // Update both Notification and UserNotification
        await this.prisma.$transaction([
            this.prisma.notification.update({
                where: { id: dto.notificationId },
                data: { read: true },
            }),
            this.prisma.userNotification.updateMany({
                where: {
                    notificationId: dto.notificationId,
                    userId,
                },
                data: { read: true },
            }),
        ]);

        return successResponse(null, "Notification marked as read");
    }

    // Mark specific UserNotification as read
    @HandleError("Failed to mark user notification as read")
    async markUserNotificationAsRead(
        userId: string,
        userNotificationId: string,
    ): Promise<TResponse<any>> {
        const userNotification = await this.prisma.userNotification.findFirst({
            where: {
                id: userNotificationId,
                userId,
            },
        });

        if (!userNotification) {
            throw new NotFoundException("User notification not found");
        }

        await this.prisma.userNotification.update({
            where: { id: userNotificationId },
            data: { read: true },
        });

        return successResponse(null, "Notification marked as read");
    }

    // Mark ALL notifications as READ
    @HandleError("Failed to mark all notifications as read")
    async markAllAsRead(userId: string) {
        await this.prisma.$transaction([
            // Update Notifications table
            this.prisma.notification.updateMany({
                where: { userId, read: false },
                data: { read: true },
            }),
            // Update UserNotifications table
            this.prisma.userNotification.updateMany({
                where: { userId, read: false },
                data: { read: true },
            }),
        ]);

        return successResponse(null, "All notifications marked as read");
    }

    // Delete a notification
    @HandleError("Failed to delete notification")
    async deleteNotification(userId: string, notificationId: string): Promise<TResponse<any>> {
        const notification = await this.prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
        });

        if (!notification) {
            throw new NotFoundException("Notification not found");
        }

        await this.prisma.notification.delete({
            where: { id: notificationId },
        });

        return successResponse(null, "Notification deleted successfully");
    }

    // Get unread notification count
    @HandleError("Failed to get unread count")
    async getUnreadCount(userId: string): Promise<TResponse<any>> {
        const count = await this.prisma.userNotification.count({
            where: { userId, read: false },
        });

        return successResponse({ count }, "Unread count retrieved successfully");
    }

    // Get notifications by type
    @HandleError("Failed to get notifications by type")
    async getNotificationsByType(userId: string, type: NotificationType): Promise<TResponse<any>> {
        const notifications = await this.prisma.userNotification.findMany({
            where: {
                userId,
                notification: {
                    type,
                },
            },
            include: {
                notification: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return successResponse(notifications, `${type} notifications retrieved successfully`);
    }

    // --------------  Get notification settings -----------------------
    @HandleError("Failed to get notification setting")
    async getNotificationSetting(userId: string): Promise<TResponse<any>> {
        const result = await this.prisma.notificationToggle.findUnique({
            where: {
                userId: userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });

        // If does not exist, create it with defaults
        if (!result) {
            const notificationToggle = await this.prisma.notificationToggle.create({
                data: {
                    userId: userId,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            role: true,
                        },
                    },
                },
            });
            return successResponse(notificationToggle, "Notification setting created successfully");
        }

        return successResponse(result, "Notification setting found successfully");
    }

    // Update notification push settings
    @HandleError("Failed to update notification setting")
    async updateNotificationSetting(
        userId: string,
        dto: NotificationToggleDto,
    ): Promise<TResponse<any>> {
        const result = await this.prisma.notificationToggle.upsert({
            where: {
                userId: userId,
            },
            update: {
                email: dto.email,
                communication: dto.communication,
                community: dto.community,
                post: dto.post,
                comment: dto.comment,
                message: dto.message,
                userRegistration: dto.userRegistration,
                ngo: dto.ngo,
                Custom: dto.Custom,
            },
            create: {
                userId: userId,
                email: dto.email,
                communication: dto.communication,
                community: dto.community,
                post: dto.post,
                comment: dto.comment,
                message: dto.message,
                userRegistration: dto.userRegistration,
                ngo: dto.ngo,
                Custom: dto.Custom,
            },
        });
        return successResponse(result, "Notification setting updated successfully");
    }

    // Profile notification toggle ON
    @HandleError("Failed to update notification setting ProfileUpdateNotificationSettingOn")
    async ProfileUpdateNotificationSettingOn(userId: string): Promise<TResponse<any>> {
        const changeNotification = await this.prisma.profile.update({
            where: {
                userId: userId,
            },
            data: {
                isToggleNotification: true,
            },
        });

        return successResponse(
            changeNotification,
            "Profile notification setting turned ON successfully",
        );
    }

    // Profile notification toggle OFF
    @HandleError("Failed to turn off profile update notification setting")
    async ProfileToogleNotificationSettingOff(userId: string): Promise<TResponse<any>> {
        const changeNotificationOff = await this.prisma.profile.update({
            where: {
                userId: userId,
            },
            data: {
                isToggleNotification: false,
            },
        });

        return successResponse(
            changeNotificationOff,
            "Profile notification setting turned OFF successfully",
        );
    }

    // NGO notification toggle ON
    @HandleError("Failed to update NGO notification setting")
    async NgoUpdateNotificationSettingOn(userId: string): Promise<TResponse<any>> {
        const NgochangeNotification = await this.prisma.ngo.updateMany({
            where: { ownerId: userId },
            data: { isToggleNotification: true },
        });

        return successResponse(
            NgochangeNotification,
            "NGO notification setting turned ON successfully",
        );
    }

    // NGO notification toggle OFF
    @HandleError("Failed to update NGO notification setting OFF")
    async NgoToogleNotificationSettingOff(userId: string): Promise<TResponse<any>> {
        const NgochangeNotificationoff = await this.prisma.ngo.updateMany({
            where: { ownerId: userId },
            data: { isToggleNotification: false },
        });

        if (NgochangeNotificationoff.count === 0) {
            return errorResponse("No NGO found for this user");
        }

        return successResponse(
            NgochangeNotificationoff,
            "NGO notification setting turned OFF successfully",
        );
    }

    // Community notification toggle ON
    @HandleError("Failed to update community notification setting")
    async CommunityUpdateNotificationSettingOn(userId: string): Promise<TResponse<any>> {
        const changeNotification = await this.prisma.community.updateMany({
            where: {
                ownerId: userId,
            },
            data: {
                isToggleNotification: true,
            },
        });

        return successResponse(
            changeNotification,
            "Community notification setting turned ON successfully",
        );
    }

    // Community notification toggle OFF
    @HandleError("Failed to update community notification setting")
    async CommunityToogleNotificationSettingOff(userId: string): Promise<TResponse<any>> {
        const changeNotification = await this.prisma.community.updateMany({
            where: {
                ownerId: userId,
            },
            data: {
                isToggleNotification: false,
            },
        });

        return successResponse(
            changeNotification,
            "Community notification setting turned OFF successfully",
        );
    }
}
