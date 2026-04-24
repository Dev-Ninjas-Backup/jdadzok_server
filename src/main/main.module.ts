import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "src/(admin)/adminGroup.module";
import { BuillQueueModule } from "./(buill-queue)/buill-queue.module";
import { CoreGroupModule } from "./(core)/core.group.module";
import { ExploreGroupModule } from "./(explore)/explore.group.module";
import { MarketplacesGroupModule } from "./(marketplace)/marketplace.group.module";
import { MetricsGroupModule } from "./(metrics)/metrics.group.module";
import { PayGroupModule } from "./(pay)/pay.group.module";
import { PostsGroupModule } from "./(posts)/posts.group.module";
import { PublicGroupModule } from "./(public)/public.group.module";
import { SharedGroupModule } from "./(shared)/shared.group.module";
import { SocketsGroupModule } from "./(sockets)/sockets.group.module";
import { StartedGroupModule } from "./(started)/started.group.module";
import { UserGroupModule } from "./(users)/users.group.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { VolunteerModule } from "./volunteer/volunteer.module";
import { StripeModule } from "./stripe/stripe.module";
import { DonationModule } from "./donation/donation.module";

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        StartedGroupModule,
        UserGroupModule,
        SocketsGroupModule,
        CoreGroupModule,
        SharedGroupModule,
        PostsGroupModule,
        MarketplacesGroupModule,
        ExploreGroupModule,
        PayGroupModule,
        BuillQueueModule,
        PublicGroupModule,
        MetricsGroupModule,
        VolunteerModule,
        AdminModule,
        StripeModule,
        DonationModule,
        DashboardModule,
    ],
    controllers: [],
    providers: [],
    exports: [],
})
export class MainModule {}
