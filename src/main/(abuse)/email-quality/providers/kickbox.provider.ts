import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import { EmailQualityProviderName } from "../email-quality.constants";
import { EmailQualityVerdict } from "../email-quality.types";
import { EmailQualityProvider } from "./email-quality-provider.interface";

interface KickboxResponse {
    result?: string;
    disposable?: boolean;
}

/**
 * Kickbox email verification plug-in.
 * @see https://docs.kickbox.com/docs/using-the-api
 */
@Injectable()
export class KickboxEmailQualityProvider implements EmailQualityProvider {
    readonly name = EmailQualityProviderName.KICKBOX;
    private readonly client: AxiosInstance;

    constructor(private readonly config: ConfigService) {
        const baseURL = this.config.get<string>("KICKBOX_API_BASE") || "https://api.kickbox.com/v2";
        this.client = axios.create({ baseURL: baseURL.replace(/\/$/, ""), timeout: 8_000 });
    }

    async check(email: string): Promise<EmailQualityVerdict> {
        const { data } = await this.client.get<KickboxResponse>("/verify", {
            params: { apikey: this.config.get<string>("KICKBOX_API_KEY"), email },
        });

        const disposable = data.disposable === true;
        const undeliverable = data.result === "undeliverable";

        const labels: string[] = [];
        if (disposable) labels.push("disposable");
        if (undeliverable) labels.push("undeliverable");

        return { deliverable: !undeliverable, disposable, labels };
    }
}
