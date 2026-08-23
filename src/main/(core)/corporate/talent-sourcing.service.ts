import { PrismaService } from "@lib/prisma/prisma.service";
import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { CapLevel, Prisma, Role } from "@prisma/client";
import { CORPORATE_TIER_CATALOG } from "@common/utils/corporate-tier.util";
import {
    capLevelsAtOrAbove,
    computeReputationRank,
    sortByReputationRank,
} from "@common/utils/reputation-rank.util";
import { capDisplayLabel } from "@common/utils/cap-earning-headline.util";
import { effectiveVolunteerHours } from "@common/utils/volunteer-hour.util";
import { ReputationPassportService } from "@module/(users)/user-profile/reputation-passport.service";
import { TalentSearchQueryDto } from "./dto/talent-sourcing.dto";

@Injectable()
export class TalentSourcingService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly reputationPassportService: ReputationPassportService,
    ) {}

    async search(userId: string, role: Role, query: TalentSearchQueryDto) {
        const membership = await this.resolveMembership(userId, role);
        const tierMeta = CORPORATE_TIER_CATALOG[membership.tier];
        const unlockedIds = await this.getUnlockedCandidateIds(membership.id);

        const where: Prisma.UserWhereInput = {
            profile: {
                isTalentSearchOptIn: true,
                ...(query.location
                    ? { location: { contains: query.location, mode: "insensitive" } }
                    : {}),
                ...(query.mentorOptInOnly ? { isVolunteerMentorOptIn: true } : {}),
                ...(query.q
                    ? {
                          OR: [
                              { name: { contains: query.q, mode: "insensitive" } },
                              { username: { contains: query.q, mode: "insensitive" } },
                              { title: { contains: query.q, mode: "insensitive" } },
                              { bio: { contains: query.q, mode: "insensitive" } },
                          ],
                      }
                    : {}),
            },
            capLevel: {
                in: capLevelsAtOrAbove(query.minCapLevel ?? CapLevel.NONE),
            },
        };

        const candidates = await this.prisma.user.findMany({
            where,
            include: {
                profile: {
                    select: {
                        name: true,
                        username: true,
                        title: true,
                        avatarUrl: true,
                        location: true,
                        isVolunteerMentorOptIn: true,
                    },
                },
                metrics: true,
            },
            take: tierMeta.talentSearchResultLimit * 3,
        });

        const ranked = sortByReputationRank(
            candidates.map((user) => {
                const hours = effectiveVolunteerHours(user.metrics ?? {});
                return {
                    userId: user.id,
                    profile: {
                        name: user.profile!.name,
                        username: user.profile!.username,
                        title: user.profile!.title,
                        avatarUrl: user.profile!.avatarUrl,
                        location: user.profile!.location,
                    },
                    cap: {
                        level: user.capLevel,
                        label: capDisplayLabel(user.capLevel),
                    },
                    volunteerHours: {
                        lifetimeVerifiedRounded: Math.ceil(hours),
                    },
                    isVolunteerMentorOptIn: user.profile!.isVolunteerMentorOptIn,
                    reputationRank: computeReputationRank({
                        capLevel: user.capLevel,
                        metrics: user.metrics,
                    }),
                    isUnlocked: unlockedIds.has(user.id),
                };
            }),
        ).slice(0, tierMeta.talentSearchResultLimit);

        return {
            items: ranked,
            ranking: "reputation_weighted",
            quota: this.buildQuota(membership),
        };
    }

    async unlockCandidate(
        userId: string,
        role: Role,
        candidateUserId: string,
        corporateMembershipId?: string,
    ) {
        const membership = await this.resolveMembership(userId, role, corporateMembershipId);
        await this.assertUnlockQuota(membership.id, membership.tier);

        const candidate = await this.prisma.user.findFirst({
            where: {
                id: candidateUserId,
                profile: { isTalentSearchOptIn: true },
            },
            select: { id: true },
        });
        if (!candidate) {
            throw new NotFoundException("Candidate not found or not opted into talent search");
        }

        const existing = await this.prisma.talentCandidateUnlock.findUnique({
            where: {
                corporateMembershipId_candidateUserId: {
                    corporateMembershipId: membership.id,
                    candidateUserId,
                },
            },
        });

        if (existing) {
            const passport = await this.reputationPassportService.getPassport(
                candidateUserId,
                userId,
            );
            return {
                unlock: existing,
                passport,
                quota: this.buildQuota(membership),
            };
        }

        const unlock = await this.prisma.$transaction(async (tx) => {
            const created = await tx.talentCandidateUnlock.create({
                data: {
                    corporateMembershipId: membership.id,
                    candidateUserId,
                },
            });
            await tx.corporateMembership.update({
                where: { id: membership.id },
                data: { talentUnlocksUsed: { increment: 1 } },
            });
            return created;
        });

        const refreshedMembership = await this.prisma.corporateMembership.findUniqueOrThrow({
            where: { id: membership.id },
        });
        const passport = await this.reputationPassportService.getPassport(candidateUserId, userId);

        return {
            unlock,
            passport,
            quota: this.buildQuota(refreshedMembership),
        };
    }

    async listUnlocks(userId: string, role: Role) {
        const membership = await this.resolveMembership(userId, role);

        const unlocks = await this.prisma.talentCandidateUnlock.findMany({
            where: { corporateMembershipId: membership.id },
            orderBy: { unlockedAt: "desc" },
            include: {
                candidate: {
                    select: {
                        id: true,
                        capLevel: true,
                        profile: {
                            select: {
                                name: true,
                                username: true,
                                title: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
        });

        return {
            items: unlocks.map((row) => ({
                id: row.id,
                unlockedAt: row.unlockedAt,
                candidate: {
                    userId: row.candidate.id,
                    capLevel: row.candidate.capLevel,
                    profile: row.candidate.profile,
                },
            })),
            quota: this.buildQuota(membership),
        };
    }

    getQuota(userId: string, role: Role) {
        return this.resolveMembership(userId, role).then((membership) =>
            this.buildQuota(membership),
        );
    }

    private buildQuota(membership: { tier: keyof typeof CORPORATE_TIER_CATALOG; talentUnlocksUsed: number }) {
        const tierMeta = CORPORATE_TIER_CATALOG[membership.tier];
        return {
            talentUnlocksLimit: tierMeta.talentUnlocksLimit,
            talentUnlocksUsed: membership.talentUnlocksUsed,
            talentUnlocksRemaining: Math.max(
                0,
                tierMeta.talentUnlocksLimit - membership.talentUnlocksUsed,
            ),
            talentSearchResultLimit: tierMeta.talentSearchResultLimit,
        };
    }

    private async getUnlockedCandidateIds(membershipId: string) {
        const rows = await this.prisma.talentCandidateUnlock.findMany({
            where: { corporateMembershipId: membershipId },
            select: { candidateUserId: true },
        });
        return new Set(rows.map((row) => row.candidateUserId));
    }

    private async assertUnlockQuota(membershipId: string, tier: keyof typeof CORPORATE_TIER_CATALOG) {
        const limit = CORPORATE_TIER_CATALOG[tier].talentUnlocksLimit;
        const used = await this.prisma.talentCandidateUnlock.count({
            where: { corporateMembershipId: membershipId },
        });
        if (used >= limit) {
            throw new ForbiddenException(
                `Talent unlock limit reached for ${CORPORATE_TIER_CATALOG[tier].label} tier (${limit})`,
            );
        }
    }

    private async resolveMembership(
        userId: string,
        role: Role,
        corporateMembershipId?: string,
    ) {
        const isAdmin = role === Role.ADMIN || role === Role.SUPER_ADMIN;

        if (corporateMembershipId) {
            if (!isAdmin) {
                throw new ForbiddenException("Only admins may specify corporateMembershipId");
            }
            const membership = await this.prisma.corporateMembership.findUnique({
                where: { id: corporateMembershipId },
            });
            if (!membership) {
                throw new NotFoundException("Corporate membership not found");
            }
            return membership;
        }

        const membership = await this.prisma.corporateMembership.findFirst({
            where: { contactPersonId: userId, isActive: true },
        });
        if (!membership) {
            throw new ForbiddenException("No active corporate membership linked to your account");
        }
        return membership;
    }
}
