import { Module } from "@nestjs/common";
import { UserChoiceRepository } from "./user-choice.repository";

@Module({
    controllers: [],
    providers: [UserChoiceRepository],
    exports: [UserChoiceRepository],
})
export class UserChoicesModule {}
