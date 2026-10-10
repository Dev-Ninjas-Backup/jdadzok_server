import { Injectable } from "@nestjs/common";
import { EmailQualityProviderName } from "../email-quality.constants";
import { EmailQualityVerdict } from "../email-quality.types";
import { EmailQualityProvider } from "./email-quality-provider.interface";

/** No-op when ABUSE_EMAIL_PROVIDER=off or misconfigured: every address passes. */
@Injectable()
export class OffEmailQualityProvider implements EmailQualityProvider {
    readonly name = EmailQualityProviderName.OFF;

    async check(email: string): Promise<EmailQualityVerdict> {
        void email;
        return { deliverable: true, disposable: false, labels: ["provider_off"] };
    }
}
