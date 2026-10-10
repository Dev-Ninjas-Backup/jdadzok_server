import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    Optional,
    UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ModerationDecision, ModerationSubjectType } from "@prisma/client";
import { PrismaService } from "@lib/prisma/prisma.service";
import { SearchSyncService } from "@module/(search)/search-sync.service";
import {
    DEFAULT_MODERATION_QUEUE_SCORE,
    DEFAULT_MODERATION_REJECT_SCORE,
    MODERATION_PROVIDER_TOKEN,
    ModerationProviderName,
} from "./moderation.constants";
import { ModerationOutcome, mapModerationScore } from "./moderation.types";
import { ModerationProvider } from "./providers/moderation-provider.interface";

@Injectable()
export class ModerationService {
    private readonly logger = new Logger(ModerationService.name);

    constructor(
        @Inject(MODERATION_PROVIDER_TOKEN) private readonly provider: ModerationProvider,
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        @Optional() private readonly searchSync?: SearchSyncService,
    ) {}

    status() {
        return {
            enabled: this.provider.name !== ModerationProviderName.OFF,
            provider: this.provider.name,
            queueScore: this.queueThreshold(),
            rejectScore: this.rejectThreshold(),
            failClosed: this.failClosed(),
            autoReject: this.autoReject(),
        };
    }

    /**
     * Scores post text. ALLOW returns silently, QUEUE returns a check id so the caller can hold
     * the post, REJECT throws. Vendor failures fail open unless ABUSE_CONTENT_FAIL_CLOSED=true,
     * in which case the post is queued for review rather than rejected.
     */
    async evaluatePost(params: {
        userId: string;
        text?: string | null;
    }): Promise<ModerationOutcome> {
        const text = params.text?.trim();
        if (this.provider.name === ModerationProviderName.OFF || !text) {
            return { decision: ModerationDecision.ALLOW, score: 0, labels: ["provider_off"] };
        }

        let score: number;
        let labels: string[];
        let vendorRef: string | undefined;

        try {
            const vendor = await this.provider.moderate(text);
            score = vendor.score;
            labels = vendor.labels;
            vendorRef = vendor.vendorRef;
        } catch (err) {
            const reason = err instanceof Error ? err.message : "unknown error";
            this.logger.warn(`Moderation vendor ${this.provider.name} failed: ${reason}`);
            if (!this.failClosed()) {
                return {
                    decision: ModerationDecision.ALLOW,
                    score: 0,
                    labels: ["vendor_error_fail_open"],
                };
            }
            score = this.queueThreshold();
            labels = ["vendor_error_fail_closed"];
        }

        let decision = mapModerationScore(score, this.queueThreshold(), this.rejectThreshold());
        if (decision === ModerationDecision.REJECT && !this.autoReject()) {
            decision = ModerationDecision.QUEUE;
        }
        if (decision === ModerationDecision.ALLOW) return { decision, score, labels };

        const check = await this.prisma.moderationCheck.create({
            data: {
                userId: params.userId,
                subjectType: ModerationSubjectType.POST,
                provider: this.provider.name,
                score,
                decision,
                vendorRef,
                labels,
            },
        });

        this.logger.log(
            `Moderation check ${check.id}: user=${params.userId} score=${score} decision=${decision}`,
        );

        if (decision === ModerationDecision.REJECT) {
            throw new UnprocessableEntityException({
                message: "Your post was blocked by our content policy",
                moderationCheckId: check.id,
            });
        }

        return { decision, score, labels, checkId: check.id };
    }

    /** Attach the held post to its check so an admin can approve or reject it. */
    async linkPost(checkId: string, postId: string): Promise<void> {
        await this.prisma.moderationCheck.update({
            where: { id: checkId },
            data: { subjectId: postId },
        });
    }

    async listChecks(params: { decision?: ModerationDecision; page?: number; limit?: number }) {
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(100, Math.max(1, params.limit ?? 20));
        const where = params.decision ? { decision: params.decision } : {};

        const [total, rows] = await Promise.all([
            this.prisma.moderationCheck.count({ where }),
            this.prisma.moderationCheck.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: { select: { id: true, email: true, capLevel: true, role: true } },
                },
            }),
        ]);

        return { page, limit, total, data: rows };
    }

    /** Publish a held post and mark the check reviewed. */
    async approve(checkId: string, adminId: string) {
        const check = await this.loadPendingCheck(checkId);

        const published = await this.prisma.post.updateMany({
            where: { id: check.subjectId! },
            data: { isHidden: false },
        });
        if (published.count === 0) throw new NotFoundException("Held post no longer exists");

        const updated = await this.markReviewed(checkId, adminId);
        await this.safeSearchUpsert(check.subjectId!);
        return updated;
    }

    /** Keep the post hidden and mark the check reviewed. */
    async reject(checkId: string, adminId: string) {
        await this.loadPendingCheck(checkId);
        return this.markReviewed(checkId, adminId);
    }

    private async loadPendingCheck(checkId: string) {
        const check = await this.prisma.moderationCheck.findUnique({ where: { id: checkId } });
        if (!check) throw new NotFoundException("Moderation check not found");
        if (check.decision !== ModerationDecision.QUEUE || !check.subjectId) {
            throw new BadRequestException("Only held posts can be reviewed");
        }
        if (check.reviewedAt) throw new BadRequestException("Moderation check already reviewed");
        return check;
    }

    private markReviewed(checkId: string, adminId: string) {
        return this.prisma.moderationCheck.update({
            where: { id: checkId },
            data: { reviewedAt: new Date(), reviewedById: adminId },
        });
    }

    private async safeSearchUpsert(postId: string) {
        try {
            await this.searchSync?.upsertPost(postId);
        } catch (err) {
            this.logger.warn(`Search upsert failed for post ${postId}: ${String(err)}`);
        }
    }

    private readNumber(key: string, fallback: number): number {
        const raw = Number(this.config.get<string>(key));
        return Number.isFinite(raw) && raw > 0 ? raw : fallback;
    }

    private queueThreshold(): number {
        return this.readNumber("ABUSE_CONTENT_QUEUE_SCORE", DEFAULT_MODERATION_QUEUE_SCORE);
    }

    private rejectThreshold(): number {
        return this.readNumber("ABUSE_CONTENT_REJECT_SCORE", DEFAULT_MODERATION_REJECT_SCORE);
    }

    private failClosed(): boolean {
        return (
            (this.config.get<string>("ABUSE_CONTENT_FAIL_CLOSED") || "false")
                .trim()
                .toLowerCase() === "true"
        );
    }

    private autoReject(): boolean {
        return (
            (this.config.get<string>("ABUSE_CONTENT_AUTO_REJECT") || "true")
                .trim()
                .toLowerCase() !== "false"
        );
    }
}
