import { ValidateSuperAdmin } from "@common/jwt/jwt.decorator";
import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
    CustomNotificationDto,
    CustomScheduleNotificationDto,
} from "../dto/custom-notification.dto";
import { AdminNotificationService } from "../service/admin.notification.service";

@ApiTags("Notification & Announcement Management")
@Controller("notification-admin")
export class AdminNotificationController {
    constructor(private readonly adminNotificationService: AdminNotificationService) {}
    @ApiOperation({ summary: "Super Admin: create custom notification" })
    @ApiBearerAuth()
    @ValidateSuperAdmin()
    @Post("custom-notification")
    async sendCustomNotification(@Body() dto: CustomNotificationDto) {
        return this.adminNotificationService.sendCustomNotification(dto);
    }

    // ------------scheduled notifications---------------
    @ApiBearerAuth()
    @ValidateSuperAdmin()
    @ApiOperation({ summary: "Schedule a notification for later" })
    @Post("schedule-custom-notification")
    async scheduleNotification(@Body() dto: CustomScheduleNotificationDto) {
        return this.adminNotificationService.scheduleNotification(dto);
    }

    // ------------notification stats---------------
    @ApiBearerAuth()
    @ValidateSuperAdmin()
    @ApiOperation({ summary: "Get notification stats: total, read, rate, last month" })
    @Get("stats")
    async getStats() {
        return this.adminNotificationService.getNotificationStats();
    }

    // ----------LATEST 6 notications----------
    @ApiOperation({ summary: "Get latest  notifications" })
    @Get("latest")
    async getLatestNotifications() {
        return this.adminNotificationService.getLatestNotifications();
    }
}
