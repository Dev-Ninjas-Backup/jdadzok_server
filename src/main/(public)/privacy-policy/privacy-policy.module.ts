import { Module } from "@nestjs/common";
import { PrivacyPolicyController } from "./privacy-policy.controller";
import { PrivacyPolicyRepository } from "./privacy-policy.repository";
import { PrivacyPolicyService } from "./privacy-policy.service";

@Module({
    controllers: [PrivacyPolicyController],
    providers: [PrivacyPolicyRepository, PrivacyPolicyService],
    exports: [],
})
export class PrivacyPolicyModule {}
