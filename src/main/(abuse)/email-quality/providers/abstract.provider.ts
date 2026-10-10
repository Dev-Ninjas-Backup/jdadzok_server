import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import { EmailQualityProviderName } from "../email-quality.constants";
import { EmailQualityVerdict } from "../email-quality.types";
import { EmailQualityProvider } from "./email-quality-provider.interface";

interface AbstractEmailResponse {
    deliverability?: string;
    is_disposable_email?: { value?: boolean };
    is_valid_format?: { value?: boolean };
}

/**
 * AbstractAPI Email Validation plug-in.
 * @see https://docs.abstractapi.com/email-validation
 */
@Injectable()
export class AbstractEmailQualityProvider implements EmailQualityProvider {
    readonly name = EmailQualityProviderName.ABSTRACT;
    private readonly client: AxiosInstance;

    constructor(private readonly config: ConfigService) {
        const baseURL =
            this.config.get<string>("ABSTRACT_EMAIL_API_BASE") ||
            "https://emailvalidation.abstractapi.com/v1";
        this.client = axios.create({ baseURL: baseURL.replace(/\/$/, ""), timeout: 8_000 });
    }

    async check(email: string): Promise<EmailQualityVerdict> {
        const { data } = await this.client.get<AbstractEmailResponse>("/", {
            params: { api_key: this.config.get<string>("ABSTRACT_EMAIL_API_KEY"), email },
        });

        const disposable = data.is_disposable_email?.value === true;
        const validFormat = data.is_valid_format?.value !== false;
        const undeliverable = data.deliverability === "UNDELIVERABLE";

        const labels: string[] = [];
        if (disposable) labels.push("disposable");
        if (undeliverable) labels.push("undeliverable");
        if (!validFormat) labels.push("invalid_format");

        return { deliverable: validFormat && !undeliverable, disposable, labels };
    }
}
