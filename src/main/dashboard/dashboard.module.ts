import { Module } from "@nestjs/common";
import { CapLevelModule } from "@module/(core)/cap-level/cap-leve.module";
import { VolunteerModule } from "@module/volunteer/volunteer.module";
import { AdminNotificationController } from "./controller/admin.notification.controller";
import { AdminSettingsController } from "./controller/admin.settings.controller";
import { CommunityNgoController } from "./controller/communityNgo.controller";
import { DashboardController } from "./controller/dashboard.controller";
import { EventController } from "./controller/event.controller";
import { IncomeAnalyticController } from "./controller/incomeAnalytic.controller";
import { MarketplaceManagementController } from "./controller/marketplaceManagement.controller";
import { OrderTransactionController } from "./controller/orderTransaction.controller";
import { UserManagementController } from "./controller/userManagement.controller";
import { VolunteerApplicationController } from "./controller/volunteerApplication.controller";
import { AdminNotificationService } from "./service/admin.notification.service";
import { AdminSettingsService } from "./service/admin.settings.service";
import { CommunityNgoService } from "./service/communityNgo.service";
import { DashboardService } from "./service/dashboard.service";
import { EventService } from "./service/event.service";
import { IncomeAnalyticService } from "./service/incomeAnalytic.service";
import { MarketplaceManagementService } from "./service/marketplaceManagement.service";
import { OrderTransactionService } from "./service/orderTransation.service";
import { UserManagementService } from "./service/userManagement.service";
import { VolunteerApplicationService } from "./service/volunteerApplication.service";
import { PayoutManagementController } from "./controller/payout.management.controller";
import { PayoutManagementService } from "./service/payout.management.service";

@Module({
    imports: [CapLevelModule, VolunteerModule],
    controllers: [
        DashboardController,
        UserManagementController,
        CommunityNgoController,
        EventController,
        MarketplaceManagementController,
        OrderTransactionController,
        IncomeAnalyticController,
        PayoutManagementController,
        AdminNotificationController,
        AdminSettingsController,
        VolunteerApplicationController,
    ],
    providers: [
        DashboardService,
        UserManagementService,
        CommunityNgoService,
        EventService,
        MarketplaceManagementService,
        OrderTransactionService,
        IncomeAnalyticService,
        PayoutManagementService,
        AdminNotificationService,
        AdminSettingsService,
        VolunteerApplicationService,
    ],
})
export class DashboardModule {}
