import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { buillQueueConfig } from "../config";
import { BuillMqService } from "./buill-mq.service";

@Module({
    imports: [ConfigModule.forRoot(), BullModule.forRootAsync(buillQueueConfig)],
    providers: [BuillMqService],
    exports: [BuillMqService],
})
export class BuillMqModule {}
