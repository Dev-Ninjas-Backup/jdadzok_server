import { Module } from "@nestjs/common";
import { WithdrawModule } from "./withdraw/withdraw.module";

@Module({
    imports: [WithdrawModule],
    providers: [],
    exports: [],
})
export class PayGroupModule {}
