import { Module } from "@nestjs/common";
import { TermsAndConditionsController } from "./terms-and-conditions.controller";
import { TermsAndConditionsRepository } from "./terms-and-conditions.repository";
import { TermsAndConditionsService } from "./terms-and-conditions.service";

@Module({
    controllers: [TermsAndConditionsController],
    providers: [TermsAndConditionsRepository, TermsAndConditionsService],
})
export class TermsAndConditionsModule {}
