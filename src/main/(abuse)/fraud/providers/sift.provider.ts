import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import { FraudEventType } from "@prisma/client";
import { FraudProviderName } from "../fraud.constants";
import { FraudScoreRequest, FraudVendorScore } from "../fraud.types";
import { FraudProvider } from "./fraud-provider.interface";

/**
 * Sift Science Events API (return_score) — payment / account abuse plug-in.
 * @see https://developers.sift.com/docs/curl/events-api/overview
 */
@Injectable()
export class SiftFraudProvider implements FraudProvider {
    readonly name = FraudProviderName.SIFT;
    private readonly logger = new Logger(SiftFraudProvider.name);
    private readonly client: AxiosInstance;
    private readonly apiKey: string;

    constructor(private readonly config: ConfigService) {
        this.apiKey = this.config.get<string>("SIFT_API_KEY") || "";
        const baseURL =
            this.config.get<string>("SIFT_API_BASE") || "https://api.sift.com/v205";
        this.client = axios.create({
            baseURL: baseURL.replace(/\/$/, ""),
            timeout: 12_000,
            auth: { username: this.apiKey, password: "" },
            headers: { "Content-Type": "application/json" },
        });
    }

    async score(request: FraudScoreRequest): Promise<FraudVendorScore> {
        const siftType =
            request.eventType === FraudEventType.PAYOUT
                ? "$transaction"
                : "$create_account";

        const body: Record<string, unknown> = {
            $type: siftType,
            $api_key: this.apiKey,
            $user_id: request.userId,
            $user_email: request.email,
            $ip: request.ip,
        };

        if (request.eventType === FraudEventType.PAYOUT && request.amountCents != null) {
            body.$amount = request.amountCents * 10_000; // micros
            body.$currency_code = (request.currency || "USD").toUpperCase();
            body.$transaction_type = "$withdrawal";
        }

        try {
            const { data } = await this.client.post("/events", body, {
                params: { return_score: true },
            });

            const scoreRaw = Number(data?.score_response?.scores?.payment_abuse?.score ?? 0);
            // Sift scores are typically 0–1; normalize to 0–100.
            const score = scoreRaw <= 1 ? Math.round(scoreRaw * 100) : Math.round(scoreRaw);
            const reasons: string[] = (data?.score_response?.scores?.payment_abuse?.reasons || [])
                .map((r: { name?: string }) => r?.name)
                .filter(Boolean);

            return {
                score: clampScore(score),
                labels: reasons.length ? reasons : ["sift_scored"],
                vendorRef: data?.score_response?.score_id || data?.request_id,
                rawReason: reasons.join(",") || undefined,
            };
        } catch (err) {
            this.logger.warn(`Sift score failed: ${String(err)}`);
            throw err;
        }
    }
}

function clampScore(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
}
