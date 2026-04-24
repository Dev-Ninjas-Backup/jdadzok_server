import { Module } from "@nestjs/common";
import { UserChoicesModule } from "../user-choice/user.choice.module";
import { ChoicesController } from "./choices.controller";
import { ChoicesRepository } from "./choices.repository";
import { ChoicesService } from "./choices.service";

@Module({
    imports: [UserChoicesModule],
    controllers: [ChoicesController],
    providers: [ChoicesRepository, ChoicesService],
    exports: [ChoicesRepository],
})
export class ChoicesModule {}
