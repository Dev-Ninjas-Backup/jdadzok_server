import { Module } from "@nestjs/common";
import { CapLevelModule } from "./cap-level/cap-leve.module";
@Module({
    imports: [CapLevelModule],
    controllers: [],
    providers: [],
    exports: [],
})
export class CoreGroupModule {}
