import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { ChoicesModule } from "./choices/choices.module";
import { UserChoicesModule } from "./user-choice/user.choice.module";

@Module({
    imports: [AuthModule, ChoicesModule, UserChoicesModule],
    controllers: [],
    providers: [],
    exports: [],
})
export class StartedGroupModule {}
