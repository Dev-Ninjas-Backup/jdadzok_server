import { GetUser, ValidateAuth } from "@common/jwt/jwt.decorator";
import { TResponse } from "@common/utils/response.util";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Query,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { NotificationType } from "@prisma/client";
import { NotificationToggleDto } from "./dto/notification-toggle";
import { ReadNotificationDto } from "./dto/read.notification.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notification Setting")
@ValidateAuth()
@ApiBearerAuth()
@Controller("notifications")
export class NotificaitonsController {
    constructor(private readonly NotificationsService: NotificationsService) {}

    // -----------Get all notifications (Admin view)---
    @ApiBearerAuth()
    @ValidateAuth()
    @ApiOperation({ summary: "Get all notifications (Admin)" })
    @Get("all")
    async getAllNotification() {
        return this.NotificationsService.getAllNotification();
    }

    // -----------Get user-specific notifications---
    @ApiBearerAuth()
    @ValidateAuth()
    @ApiOperation({ summary: "Get current user's notifications" })
    @Get("user-notifications")
    async getUserNotifications(@GetUser("userId") userId: string): Promise<TResponse<any>> {
        return this.NotificationsService.getUserNotifications(userId);
    }

    // -----------Get notifications by type---
    @ApiBearerAuth()
    @ValidateAuth()
    @ApiOperation({ summary: "Get notifications by type" })
    @ApiQuery({ name: "type", enum: NotificationType })
    @Get("by-type")
    async getNotificationsByType(
        @GetUser("userId") userId: string,
        @Query("type") type: NotificationType,
    ): Promise<TResponse<any>> {
        return this.NotificationsService.getNotificationsByType(userId, type);
    }

    // -----------Get unread count---
    @ApiBearerAuth()
    @ValidateAuth()
    @ApiOperation({ summary: "Get unread notification count" })
    @Get("unread-count")
    async getUnreadCount(@GetUser("userId") userId: string): Promise<TResponse<any>> {
        return this.NotificationsService.getUnreadCount(userId);
    }

    // ----------------Mark notification as read (using notificationId)---------------
    @ApiBearerAuth()
    @ValidateAuth()
    @ApiOperation({ summary: "Mark notification as read" })
    @Patch("read")
    async readOne(@Body() dto: ReadNotificationDto, @GetUser("userId") userId: string) {
        return this.NotificationsService.markAsRead(dto, userId);
    }

    // ----------------Mark UserNotification as read (using userNotificationId)---------------
    @ApiBearerAuth()
    @ValidateAuth()
    @ApiOperation({ summary: "Mark user notification as read" })
    @ApiParam({ name: "id", description: "UserNotification ID" })
    @Patch("read/:id")
    async markUserNotificationAsRead(
        @GetUser("userId") userId: string,
        @Param("id") userNotificationId: string,
    ): Promise<TResponse<any>> {
        return this.NotificationsService.markUserNotificationAsRead(userId, userNotificationId);
    }

    // ----------------Mark all notifications as read---------------
    @ApiBearerAuth()
    @ValidateAuth()
    @ApiOperation({ summary: "Mark all notifications as read" })
    @Patch("read-all")
    async readAll(@GetUser("userId") userId: string) {
        return this.NotificationsService.markAllAsRead(userId);
    }

    // ----------------Delete notification---------------
    @ApiBearerAuth()
    @ValidateAuth()
    @ApiOperation({ summary: "Delete a notification" })
    @ApiParam({ name: "id", description: "Notification ID" })
    @Delete(":id")
    async deleteNotification(
        @GetUser("userId") userId: string,
        @Param("id") notificationId: string,
    ): Promise<TResponse<any>> {
        return this.NotificationsService.deleteNotification(userId, notificationId);
    }

    //   ----------Get notification settings-------------
    @ApiBearerAuth()
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: "Get notification settings" })
    @Get()
    async getNotificationSetting(@GetUser("userId") userId: string): Promise<TResponse<any>> {
        return await this.NotificationsService.getNotificationSetting(userId);
    }

    // ---------Update notification push settings
    @Patch("push-settings")
    @ApiOperation({ summary: "Update notification push settings" })
    async updateNotificationSetting(
        @GetUser("userId") userId: string,
        @Body() dto: NotificationToggleDto,
    ): Promise<TResponse<any>> {
        return await this.NotificationsService.updateNotificationSetting(userId, dto);
    }

    // --------------  Profile notification toggle ON -----------------
    @ApiOperation({
        summary: "Toggle profile notification ON",
        description: "Enable notifications for profile changes",
    })
    @ApiBearerAuth()
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    @Patch("profile-change-toggle-setting-on")
    async ProfileUpdateNotificationSettingOn(
        @GetUser("userId") userId: string,
    ): Promise<TResponse<any>> {
        return await this.NotificationsService.ProfileUpdateNotificationSettingOn(userId);
    }

    // --------------  Profile notification toggle OFF -----------------
    @ApiOperation({
        summary: "Toggle profile notification OFF",
        description: "Disable notifications for profile changes",
    })
    @ApiBearerAuth()
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    @Patch("profile-change-toggle-setting-off")
    async ProfileToogleNotificationSettingOff(
        @GetUser("userId") userId: string,
    ): Promise<TResponse<any>> {
        return await this.NotificationsService.ProfileToogleNotificationSettingOff(userId);
    }

    // --------------  NGO notification toggle ON -----------------
    @ApiOperation({
        summary: "Toggle NGO notification ON",
        description: "Enable notifications for NGO activities",
    })
    @ApiBearerAuth()
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    @Patch("Ngo-Toggle-toggle-setting-on")
    async NgoUpdateNotificationSettingOn(
        @GetUser("userId") userId: string,
    ): Promise<TResponse<any>> {
        return await this.NotificationsService.NgoUpdateNotificationSettingOn(userId);
    }

    // --------------  NGO notification toggle OFF -----------------
    @ApiOperation({
        summary: "Toggle NGO notification OFF",
        description: "Disable notifications for NGO activities",
    })
    @ApiBearerAuth()
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    @Patch("Ngo-change-toggle-setting-off")
    async NgoToogleNotificationSettingOff(
        @GetUser("userId") userId: string,
    ): Promise<TResponse<any>> {
        return await this.NotificationsService.NgoToogleNotificationSettingOff(userId);
    }

    // --------------  Community notification toggle ON -----------------
    @ApiOperation({
        summary: "Toggle community notification ON",
        description: "Enable notifications for community activities",
    })
    @ApiBearerAuth()
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    @Patch("community-Toggle-toggle-setting-on")
    async CommunityUpdateNotificationSettingOn(
        @GetUser("userId") userId: string,
    ): Promise<TResponse<any>> {
        return await this.NotificationsService.CommunityUpdateNotificationSettingOn(userId);
    }

    // --------------  Community notification toggle OFF -----------------
    @ApiOperation({
        summary: "Toggle community notification OFF",
        description: "Disable notifications for community activities",
    })
    @ApiBearerAuth()
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    @Patch("Community-change-toggle-setting-off")
    async CommunityToogleNotificationSettingOff(
        @GetUser("userId") userId: string,
    ): Promise<TResponse<any>> {
        return await this.NotificationsService.CommunityToogleNotificationSettingOff(userId);
    }
}
