import { Global, Module } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OptService } from "./otp.service";
import { UtilsService } from "./utils.service";

@Global()
@Module({
    providers: [UtilsService, OptService, JwtService],
    exports: [UtilsService, OptService],
})
export class UtilsModule {}
