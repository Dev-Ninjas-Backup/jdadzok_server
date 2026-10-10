import { Injectable } from "@nestjs/common";
import { EmailQualityProviderName } from "../email-quality.constants";
import { EmailQualityVerdict } from "../email-quality.types";
import { EmailQualityProvider } from "./email-quality-provider.interface";

const DISPOSABLE_DOMAINS = ["mailinator.com", "10minutemail.com", "tempmail.test"];

/** Deterministic local stand-in for CI / demos (not a real vendor). */
@Injectable()
export class MemoryEmailQualityProvider implements EmailQualityProvider {
    readonly name = EmailQualityProviderName.MEMORY;

    async check(email: string): Promise<EmailQualityVerdict> {
        const normalized = email.trim().toLowerCase();
        const domain = normalized.split("@")[1] ?? "";

        if (DISPOSABLE_DOMAINS.includes(domain)) {
            return { deliverable: true, disposable: true, labels: ["memory_disposable"] };
        }
        if (domain === "invalid.test") {
            return { deliverable: false, disposable: false, labels: ["memory_undeliverable"] };
        }
        return { deliverable: true, disposable: false, labels: ["memory_ok"] };
    }
}
