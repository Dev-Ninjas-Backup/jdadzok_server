import { EmailQualityProviderName } from "../email-quality.constants";
import { EmailQualityVerdict } from "../email-quality.types";

export interface EmailQualityProvider {
    readonly name: EmailQualityProviderName;

    /** Ask the vendor (or stand-in) whether the address is real and non-disposable. */
    check(email: string): Promise<EmailQualityVerdict>;
}
