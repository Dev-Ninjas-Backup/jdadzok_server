import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import { FraudEventType } from "@prisma/client";
import { FraudProviderName } from "../fraud.constants";
import { FraudScoreRequest, FraudVendorScore } from "../fraud.types";
import { FraudProvider } from "./fraud-provider.interface";

/**
 * SEON Fraud API v2 — account / payment abuse plug-in.
 * @see https://docs.seon.io/api-reference
 */
@Injectable()
export class SeonFraudProvider implements FraudProvider {
    readonly name = FraudProviderName.SEON;
    private readonly logger = new Logger(SeonFraudProvider.name);
    private readonly client: AxiosInstance;

    constructor(private readonly config: ConfigService) {
        const apiKey = this.config.get<string>("SEON_API_KEY") || "";
        const baseURL =
            this.config.get<string>("SEON_API_BASE") || "https://api.us.seon.io/SeonRestService";
        this.client = axios.create({
            baseURL: baseURL.replace(/\/$/, ""),
            timeout: 12_000,
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
            },
        });
    }

    async score(request: FraudScoreRequest): Promise<FraudVendorScore> {
        const actionType =
            request.eventType === FraudEventType.PAYOUT
                ? "withdrawal"
                : request.eventType === FraudEventType.STRIPE_ONBOARDING
                  ? "account_register"
                  : "account_login";

        const body: Record<string, unknown> = {
            config: {
                ip: { include: "flags,history,id" },
                email: { include: "flags,history,id" },
                ip_api: true,
                email_api: true,
            },
            ip: request.ip,
            email: request.email,
            user_id: request.userId,
            action_type: actionType,
            transaction_id: request.requestId || `${request.userId}:${Date.now()}`,
        };

        if (request.amountCents != null) {
            body.transaction_amount = request.amountCents / 100;
            body.transaction_currency = (request.currency || "USD").toUpperCase();
        }

        try {
            const { data } = await this.client.post("/fraud-api/v2", body);
            const fraudScore = Number(data?.data?.fraud_score ?? data?.fraud_score ?? 0);
            const state = String(data?.data?.state || data?.state || "");
            const labels: string[] = [];
            if (state) labels.push(`seon_${state.toLowerCase()}`);
            const appliedRules = data?.data?.applied_rules || data?.applied_rules || [];
            for (const rule of appliedRules) {
                if (rule?.id) labels.push(String(rule.id));
                else if (rule?.name) labels.push(String(rule.name));
            }
            if (labels.length === 0) labels.push("seon_scored");

            return {
                score: clampScore(fraudScore),
                labels: labels.slice(0, 20),
                vendorRef: data?.data?.id || data?.id,
                rawReason: state || undefined,
            };
        } catch (err) {
            this.logger.warn(`SEON score failed: ${String(err)}`);
            throw err;
        }
    }
}

function clampScore(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
}
