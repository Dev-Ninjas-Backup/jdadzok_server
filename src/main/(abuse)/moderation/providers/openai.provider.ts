import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import { ModerationProviderName } from "../moderation.constants";
import { ModerationVendorScore } from "../moderation.types";
import { ModerationProvider } from "./moderation-provider.interface";

interface OpenAiModerationResponse {
    id?: string;
    results?: {
        flagged?: boolean;
        categories?: Record<string, boolean>;
        category_scores?: Record<string, number>;
    }[];
}

const MAX_INPUT_CHARS = 20_000;

/**
 * OpenAI Moderation API plug-in. The score is the highest category score (0–1) scaled to 0–100.
 * @see https://platform.openai.com/docs/guides/moderation
 */
@Injectable()
export class OpenAiModerationProvider implements ModerationProvider {
    readonly name = ModerationProviderName.OPENAI;
    private readonly client: AxiosInstance;

    constructor(private readonly config: ConfigService) {
        const baseURL = this.config.get<string>("OPENAI_API_BASE") || "https://api.openai.com/v1";
        this.client = axios.create({
            baseURL: baseURL.replace(/\/$/, ""),
            timeout: 10_000,
            headers: { Authorization: `Bearer ${this.config.get<string>("OPENAI_API_KEY") ?? ""}` },
        });
    }

    async moderate(text: string): Promise<ModerationVendorScore> {
        const { data } = await this.client.post<OpenAiModerationResponse>("/moderations", {
            model: this.config.get<string>("OPENAI_MODERATION_MODEL") || "omni-moderation-latest",
            input: text.slice(0, MAX_INPUT_CHARS),
        });

        const result = data.results?.[0];
        const scores = Object.values(result?.category_scores ?? {});
        const score = scores.length > 0 ? Math.round(Math.max(...scores) * 10_000) / 100 : 0;
        const labels = Object.entries(result?.categories ?? {})
            .filter(([, flagged]) => flagged)
            .map(([category]) => category);

        return { score, labels, vendorRef: data.id };
    }
}
