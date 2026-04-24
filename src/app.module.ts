import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PassportModule } from "@nestjs/passport";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { LibModule } from "./lib/lib.module";
import { NotificationModule } from "./lib/notification/notification.module";
import { DonationModule } from "./main/donation/donation.module";
import { MainModule } from "./main/main.module";
import { S3BucketModule } from "./s3/s3.module";
@Module({
    imports: [
        ScheduleModule.forRoot(),
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ConfigModule.forRoot({ isGlobal: true }),
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
        NotificationModule,
        PassportModule,
        LibModule,
        MainModule,
        S3BucketModule,
        DonationModule,
    ],
    providers: [],
    controllers: [AppController],
})
export class AppModule {}
// export class AppModule implements NestModule {
//   configure(consumer: MiddlewareConsumer) {
//     consumer.apply(LoggerMiddleware).forRoutes('*');
//   }
// }
