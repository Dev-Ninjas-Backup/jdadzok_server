import { Module } from "@nestjs/common";
import { BridgeModule } from "./bridge.module";

@Module({
    imports: [BridgeModule],
    exports: [BridgeModule],
})
export class BridgeGroupModule {}
