import { Module } from "@nestjs/common";
import { AboutUsModule } from "./about-us/about-us.module";
import { PrivacyPolicyModule } from "./privacy-policy/privacy-policy.module";
import { TermsAndConditionsModule } from "./terms-and-conditions/terms-and-conditions.module";

@Module({
    imports: [AboutUsModule, PrivacyPolicyModule, TermsAndConditionsModule],
    providers: [],
    exports: [],
})
export class PublicGroupModule {}
