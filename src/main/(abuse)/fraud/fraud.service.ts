import {
    ForbiddenException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FraudDecision, FraudEventType } from "@prisma/client";
import { PrismaService } from "@lib/prisma/prisma.service";
import {
    DEFAULT_FRAUD_QUEUE_SCORE,
    DEFAULT_FRAUD_REJECT_SCORE,
    FRAUD_PROVIDER_TOKEN,
    FraudProviderName,
} from "./fraud.constants";
import { FraudProvider } from "./providers/fraud-provider.interface";
import {
    FraudEvaluationResult,
    FraudScoreRequest,
    mapScoreToDecision,
} from "./fraud.types";

@Injectable()
export class FraudService {
    private readonly logger = new Logger(FraudService.name);

    constructor(
        @Inject(FRAUD_PROVIDER_TOKEN) private readonly provider: FraudProvider,
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {}

    status() {
        const enabled = this.provider.name !== FraudProviderName.OFF;
        return {
            enabled,
            provider: this.provider.name,
            queueScore: this.queueThreshold(),
            rejectScore: this.rejectThreshold(),
            failClosed: this.failClosed(),
            autoReject: this.autoReject(),
        };
    }

    /**
     * Score via vendor plug-in, persist FraudCheck, optionally block.
     * When provider is off: ALLOW (feature flag). Vendor failures: fail-open unless ABUSE_FRAUD_FAIL_CLOSED=true.
     */
    async evaluate(request: FraudScoreRequest): Promise<FraudEvaluationResult> {
        if (this.provider.name === FraudProviderName.OFF) {
            return {
                provider: FraudProviderName.OFF,
                enabled: false,
                score: 0,
                decision: FraudDecision.ALLOW,
                labels: ["provider_off"],
            };
        }

        let score = 0;
        let labels: string[] = [];
        let vendorRef: string | undefined;
        let reason: string | undefined;

        try {
            const vendor = await this.provider.score(request);
            score = vendor.score;
            labels = vendor.labels;
            vendorRef = vendor.vendorRef;
            reason = vendor.rawReason;
        } catch (err) {
            this.logger.warn(
                `Fraud vendor ${this.provider.name} failed for user=${request.userId}: ${String(err)}`,
            );
            if (this.failClosed()) {
                score = 100;
                labels = ["vendor_error_fail_closed"];
                reason = "vendor_unreachable";
            } else {
                return {
                    provider: this.provider.name,
                    enabled: true,
                    score: 0,
                    decision: FraudDecision.ALLOW,
                    labels: ["vendor_error_fail_open"],
                    reason: "vendor_unreachable",
                };
            }
        }

        const decision = mapScoreToDecision(
            score,
            this.queueThreshold(),
            this.rejectThreshold(),
        );

        const check = await this.prisma.fraudCheck.create({
            data: {
                userId: request.userId,
                eventType: request.eventType,
                provider: this.provider.name,
                score,
                decision,
                vendorRef,
                labels,
                reason,
            },
        });

        this.logger.log(
            `Fraud check ${check.id}: user=${request.userId} event=${request.eventType} score=${score} decision=${decision}`,
        );

        if (decision === FraudDecision.REJECT && this.autoReject()) {
            throw new ForbiddenException({
                message: "Account flagged by fraud vendor — onboarding / payout blocked",
                fraudCheckId: check.id,
                score,
                decision,
            });
        }

        return {
            provider: this.provider.name,
            enabled: true,
            score,
            decision,
            labels,
            vendorRef,
            checkId: check.id,
            reason,
        };
    }

    async evaluateStripeOnboarding(params: {
        userId: string;
        email: string;
        ip?: string;
    }): Promise<FraudEvaluationResult> {
        return this.evaluate({
            userId: params.userId,
            email: params.email,
            eventType: FraudEventType.STRIPE_ONBOARDING,
            ip: params.ip,
        });
    }

    async evaluatePayout(params: {
        userId: string;
        email: string;
        amountCents: number;
        currency?: string;
        ip?: string;
    }): Promise<FraudEvaluationResult> {
        return this.evaluate({
            userId: params.userId,
            email: params.email,
            eventType: FraudEventType.PAYOUT,
            amountCents: params.amountCents,
            currency: params.currency,
            ip: params.ip,
        });
    }

    async listChecks(params: {
        decision?: FraudDecision;
        page?: number;
        limit?: number;
    }) {
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(100, Math.max(1, params.limit ?? 20));
        const where = params.decision ? { decision: params.decision } : {};

        const [total, rows] = await Promise.all([
            this.prisma.fraudCheck.count({ where }),
            this.prisma.fraudCheck.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            capLevel: true,
                            role: true,
                        },
                    },
                },
            }),
        ]);

        return {
            page,
            limit,
            total,
            totalPage: Math.ceil(total / limit) || 1,
            items: rows,
        };
    }

    /** Admin override — mark queued/rejected check as reviewed (does not ban). */
    async clearCheck(checkId: string, adminUserId: string) {
        const existing = await this.prisma.fraudCheck.findUnique({ where: { id: checkId } });
        if (!existing) throw new NotFoundException("Fraud check not found");

        return this.prisma.fraudCheck.update({
            where: { id: checkId },
            data: {
                reviewedAt: new Date(),
                reviewedById: adminUserId,
                reason: existing.reason
                    ? `${existing.reason}; admin_cleared`
                    : "admin_cleared",
            },
        });
    }

    private queueThreshold(): number {
        const raw = Number(this.config.get<string>("ABUSE_FRAUD_QUEUE_SCORE"));
        return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_FRAUD_QUEUE_SCORE;
    }

    private rejectThreshold(): number {
        const raw = Number(this.config.get<string>("ABUSE_FRAUD_REJECT_SCORE"));
        return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_FRAUD_REJECT_SCORE;
    }

    private failClosed(): boolean {
        return (this.config.get<string>("ABUSE_FRAUD_FAIL_CLOSED") || "false")
            .trim()
            .toLowerCase() === "true";
    }

    /** When false, REJECT is recorded but does not throw (admin queue only). */
    private autoReject(): boolean {
        return (this.config.get<string>("ABUSE_FRAUD_AUTO_REJECT") || "true")
            .trim()
            .toLowerCase() !== "false";
    }
}
