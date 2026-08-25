import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import { FraudEventType } from "@prisma/client";
import { FraudProviderName } from "../fraud.constants";
import { FraudScoreRequest, FraudVendorScore } from "../fraud.types";
import { FraudProvider } from "./fraud-provider.interface";

/**
 * Castle Risk API — account abuse / ATO plug-in.
 * @see https://docs.castle.io/docs/api-reference/risk
 */
@Injectable()
export class CastleFraudProvider implements FraudProvider {
    readonly name = FraudProviderName.CASTLE;
    private readonly logger = new Logger(CastleFraudProvider.name);
    private readonly client: AxiosInstance;

    constructor(private readonly config: ConfigService) {
        const apiSecret = this.config.get<string>("CASTLE_API_SECRET") || "";
        const baseURL = this.config.get<string>("CASTLE_API_BASE") || "https://api.castle.io/v1";
        this.client = axios.create({
            baseURL: baseURL.replace(/\/$/, ""),
            timeout: 12_000,
            auth: { username: apiSecret, password: "" },
            headers: { "Content-Type": "application/json" },
        });
    }

    async score(request: FraudScoreRequest): Promise<FraudVendorScore> {
        const type =
            request.eventType === FraudEventType.PAYOUT
                ? "$transaction"
                : request.eventType === FraudEventType.STRIPE_ONBOARDING
                  ? "$registration"
                  : "$login";

        const body: Record<string, unknown> = {
            type,
            request_token: request.requestId,
            user: {
                id: request.userId,
                email: request.email,
            },
            context: {
                ip: request.ip,
            },
        };

        if (request.amountCents != null) {
            body.transaction = {
                amount: {
                    value: String(request.amountCents / 100),
                    currency: (request.currency || "USD").toUpperCase(),
                },
                type: "withdrawal",
            };
        }

        try {
            const { data } = await this.client.post("/risk", body);
            const risk = Number(data?.risk ?? 0);
            // Castle risk is typically 0–1.
            const score = risk <= 1 ? Math.round(risk * 100) : Math.round(risk);
            const policy = String(data?.policy?.action || data?.action || "");
            const labels: string[] = [];
            if (policy) labels.push(`castle_${policy.toLowerCase()}`);
            const signals = data?.signals || {};
            for (const key of Object.keys(signals).slice(0, 15)) {
                if (signals[key]) labels.push(key);
            }
            if (labels.length === 0) labels.push("castle_scored");

            return {
                score: clampScore(score),
                labels,
                vendorRef: data?.id || data?.device?.fingerprint,
                rawReason: policy || undefined,
            };
        } catch (err) {
            this.logger.warn(`Castle score failed: ${String(err)}`);
            throw err;
        }
    }
}

function clampScore(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
}
