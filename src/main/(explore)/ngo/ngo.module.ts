import { Module } from "@nestjs/common";
import { NgoController } from "./ngo.controller";
import { NgoRepository } from "./ngo.repository";
import { NgoService } from "./ngo.service";
import { NgoVerificationModule } from "./ngoVerification/ngo-verification.module";

@Module({
    imports: [NgoVerificationModule],
    controllers: [NgoController],
    providers: [NgoRepository, NgoService],
    exports: [],
})
export class NgoModule {}
