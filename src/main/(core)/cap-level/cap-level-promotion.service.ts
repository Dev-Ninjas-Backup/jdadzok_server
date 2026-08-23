import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { CapLevelRepository } from "./cap-lavel.repository";
import { CapLevelService } from "./cap-lavel.service";
import { PromoteUserDto } from "./dto/cap-leve.dto";
import {
    CAP_LADDER_ORDER,
    getNextLadderLevel,
} from "@common/utils/cap-level.util";
import { PrismaService } from "@lib/prisma/prisma.service";
import { EVENT_TYPES } from "@common/interface/events-name";
import { CapLevelEvent } from "@common/interface/events-payload";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CapLevel, CapPromotionAction, Role } from "@prisma/client";

@Injectable()
export class CapLevelPromotionService {
    constructor(
        private readonly repository: CapLevelRepository,
        private readonly capLevelService: CapLevelService,
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async getMyCapStatus(userId: string): Promise<Awaited<ReturnType<CapLevelService["getUserCapStatus"]>>> {
        return this.capLevelService.getUserCapStatus(userId);
    }

    /** Users at RED who meet Black verified-hours + score thresholds — awaiting admin review. */
    async listPendingBlackReview() {
        const blackReq = await this.repository.getCapRequirements("BLACK");
        if (!blackReq) {
            return [];
        }

        return this.prisma.user.findMany({
            where: {
                capLevel: CapLevel.RED,
                metrics: {
                    is: {
                        ...(blackReq.minVolunteerHours != null
                            ? { volunteerHours: { gte: blackReq.minVolunteerHours } }
                            : {}),
                        ...(blackReq.minActivityScore != null
                            ? { activityScore: { gte: blackReq.minActivityScore } }
                            : {}),
                    },
                },
            },
            include: {
                metrics: true,
                profile: { select: { name: true } },
            },
            orderBy: { updatedAt: "desc" },
        });
    }

    async listPromotionAudit(userId: string) {
        return this.prisma.capPromotionAudit.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            include: {
                actor: {
                    select: {
                        id: true,
                        email: true,
                        profile: { select: { name: true } },
                    },
                },
            },
        });
    }

    async promoteUser(
        actorId: string,
        userId: string,
        dto: PromoteUserDto,
        actorRole: Role = Role.ADMIN,
    ) {
        const targetLevel = dto.targetLevel;
        if (!targetLevel) {
            throw new BadRequestException("targetLevel is required");
        }

        if (targetLevel === CapLevel.SKY_BLUE) {
            throw new BadRequestException(
                "Sky Blue is invitation-only. Use POST /cap-level/sky-blue/nominate.",
            );
        }

        const user = await this.repository.getUserWithMetrics(userId);
        if (!user) {
            throw new NotFoundException("User not found");
        }

        const fromLevel = user.capLevel;
        if (fromLevel === targetLevel) {
            throw new BadRequestException("User is already at the target Cap level");
        }

        const bypass = dto.bypassVerification === true;
        if (bypass && !dto.bypassReason?.trim()) {
            throw new BadRequestException(
                "bypassReason is required when bypassVerification is true (audit trail)",
            );
        }

        if (bypass && actorRole !== Role.ADMIN && actorRole !== Role.SUPER_ADMIN) {
            throw new ForbiddenException("Only admins may bypass Cap promotion gates");
        }

        const requirements = await this.repository.getCapRequirements(targetLevel);
        if (!requirements) {
            throw new BadRequestException(`No requirements configured for ${targetLevel}`);
        }

        await this.userMetricsServiceEnsure(userId);
        const metrics = await this.capLevelService.calculateCapEligibility(userId);

        if (!bypass) {
            this.assertSequentialOrDowngrade(fromLevel, targetLevel);

            if (targetLevel === CapLevel.BLACK && fromLevel !== CapLevel.RED) {
                throw new BadRequestException(
                    "Black Cap requires the member to already hold Red Cap before admin review.",
                );
            }

            if (targetLevel === CapLevel.RED && fromLevel !== CapLevel.YELLOW) {
                throw new BadRequestException(
                    "Red Cap requires the member to already hold Yellow Cap (one rung at a time).",
                );
            }

            this.assertMeetsRequirements(metrics, requirements, targetLevel);

            if (requirements.requiresVerification && !this.isAdminRole(actorRole)) {
                throw new ForbiddenException(
                    `${targetLevel} promotion requires admin review. Use the admin promote endpoint.`,
                );
            }
        }

        const action: CapPromotionAction = bypass
            ? CapPromotionAction.ADMIN_OVERRIDE
            : CapPromotionAction.ADMIN_PROMOTED;

        return this.applyPromotion({
            userId,
            actorId,
            fromLevel,
            toLevel: targetLevel,
            action,
            bypassVerification: bypass,
            bypassReason: dto.bypassReason?.trim() || null,
            reviewNotes: dto.reviewNotes?.trim() || null,
            volunteerHours: metrics.volunteerHours,
            activityScore: metrics.activityScore,
        });
    }

    /** Auto-promote at most one ladder rung when verification is not required. */
    async tryAutoPromote(userId: string): Promise<{ promoted: boolean; toLevel?: CapLevel }> {
        const eligibility = await this.capLevelService.calculateCapEligibility(userId);
        if (!eligibility.canPromote || !eligibility.eligibleLevel) {
            return { promoted: false };
        }

        const nextLevel = getNextLadderLevel(eligibility.currentLevel);
        if (!nextLevel || eligibility.eligibleLevel !== nextLevel) {
            return { promoted: false };
        }

        if (nextLevel === CapLevel.RED || nextLevel === CapLevel.BLACK) {
            return { promoted: false };
        }

        const requirements = eligibility.requirements;
        if (
            !requirements ||
            requirements.requiresVerification ||
            requirements.requiresNomination
        ) {
            return { promoted: false };
        }

        const user = await this.repository.getUserWithMetrics(userId);
        if (!user) {
            return { promoted: false };
        }

        await this.applyPromotion({
            userId,
            actorId: null,
            fromLevel: user.capLevel,
            toLevel: nextLevel,
            action: CapPromotionAction.AUTO_PROMOTED,
            bypassVerification: false,
            bypassReason: null,
            reviewNotes: null,
            volunteerHours: eligibility.volunteerHours,
            activityScore: eligibility.activityScore,
        });

        return { promoted: true, toLevel: nextLevel };
    }

    private async applyPromotion(input: {
        userId: string;
        actorId: string | null;
        fromLevel: CapLevel;
        toLevel: CapLevel;
        action: CapPromotionAction;
        bypassVerification: boolean;
        bypassReason: string | null;
        reviewNotes: string | null;
        volunteerHours: number;
        activityScore: number;
    }) {
        const updatedUser = await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.update({
                where: { id: input.userId },
                data: { capLevel: input.toLevel },
            });

            await tx.capPromotionAudit.create({
                data: {
                    userId: input.userId,
                    actorId: input.actorId,
                    fromLevel: input.fromLevel,
                    toLevel: input.toLevel,
                    action: input.action,
                    bypassVerification: input.bypassVerification,
                    bypassReason: input.bypassReason,
                    reviewNotes: input.reviewNotes,
                    volunteerHoursAtPromotion: Math.round(input.volunteerHours),
                    activityScoreAtPromotion: input.activityScore,
                },
            });

            await tx.notification.create({
                data: {
                    userId: input.userId,
                    type: "CAP_UPGRADE",
                    title: `Cap Level Updated: ${input.fromLevel} → ${input.toLevel}`,
                    message: input.bypassVerification
                        ? `Your Cap level was updated by an administrator (override recorded in audit trail).`
                        : `Your Cap level has been updated from ${input.fromLevel} to ${input.toLevel}.`,
                },
            });

            return user;
        });

        const payload: CapLevelEvent = {
            action: "CREATE",
            meta: {
                postId: input.userId,
                performedBy: input.actorId ?? input.userId,
                publishedAt: new Date(),
            },
            info: {
                title: `CapLevel Updated: ${input.fromLevel} → ${input.toLevel}`,
                message: `Cap level changed from ${input.fromLevel} to ${input.toLevel}`,
                authorId: input.userId,
                caplevelDetials: [{ oldLevel: input.fromLevel, newLevel: input.toLevel }],
                recipients: [{ id: updatedUser.id, email: updatedUser.email }],
            },
        };
        this.eventEmitter.emit(EVENT_TYPES.CAPLEVEL_CREATE, payload);

        return {
            userId: input.userId,
            fromLevel: input.fromLevel,
            toLevel: input.toLevel,
            action: input.action,
            bypassVerification: input.bypassVerification,
        };
    }

    private assertSequentialOrDowngrade(from: CapLevel, to: CapLevel) {
        const fromIdx = CAP_LADDER_ORDER.indexOf(from as (typeof CAP_LADDER_ORDER)[number]);
        const toIdx = CAP_LADDER_ORDER.indexOf(to as (typeof CAP_LADDER_ORDER)[number]);
        if (fromIdx === -1 || toIdx === -1) {
            throw new BadRequestException("Invalid Cap level transition");
        }
        if (toIdx > fromIdx + 1) {
            throw new BadRequestException(
                "Cap promotions must advance one ladder rung at a time (no skipping to Black).",
            );
        }
    }

    private assertMeetsRequirements(
        metrics: { volunteerHours: number; activityScore: number; missingRequirements: string[] },
        requirements: { minActivityScore: number | null; minVolunteerHours: number | null },
        targetLevel: CapLevel,
    ) {
        const missing: string[] = [];

        if (
            requirements.minActivityScore != null &&
            metrics.activityScore < requirements.minActivityScore
        ) {
            missing.push(
                `Activity Score: ${metrics.activityScore}/${requirements.minActivityScore}`,
            );
        }

        if (
            requirements.minVolunteerHours != null &&
            metrics.volunteerHours < requirements.minVolunteerHours
        ) {
            missing.push(
                `Verified Volunteer Hours: ${metrics.volunteerHours}/${requirements.minVolunteerHours}`,
            );
        }

        if (missing.length) {
            throw new BadRequestException(
                `User does not meet ${targetLevel} requirements: ${missing.join("; ")}`,
            );
        }
    }

    private isAdminRole(role: Role): boolean {
        return role === Role.ADMIN || role === Role.SUPER_ADMIN || role === Role.MODERATOR;
    }

    private async userMetricsServiceEnsure(userId: string) {
        await this.repository.createUserMetricsIfNotExists(userId);
    }
}
