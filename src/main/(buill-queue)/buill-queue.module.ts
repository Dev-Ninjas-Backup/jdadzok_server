import { Module } from "@nestjs/common";
import { BuillMqModule } from "./buill-mq/buill-mq.module";
import { WorkersModule } from "./workers/workers.module";

@Module({
    imports: [BuillMqModule, WorkersModule],
    providers: [],
    controllers: [],
    exports: [],
})
export class BuillQueueModule {}
