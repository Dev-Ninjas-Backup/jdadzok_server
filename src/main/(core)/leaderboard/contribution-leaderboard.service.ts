import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import {
    CapLevel,
    ContributionType,
    VolunteerHourVerificationStatus,
} from "@prisma/client";
import { capDisplayLabel } from "@common/utils/cap-earning-headline.util";
import {
    capLevelsAtOrAbove,
} from "@common/utils/reputation-rank.util";
import {
    computeContributionScore,
    CONTRIBUTION_LEADERBOARD_EXCLUDES,
    contributionSortValue,
    ContributionSignals,
    ContributionSortField,
} from "@common/utils/contribution-score.util";
import { ContributionLeaderboardQueryDto } from "./dto/contribution-leaderboard.dto";

type LeaderboardEntry = ContributionSignals & {
    userId: string;
    capLevel: CapLevel;
    profile: {
        name: string;
        username: string;
        avatarUrl: string | null;
    };
};

@Injectable()
export class ContributionLeaderboardService {
    constructor(private readonly prisma: PrismaService) {}

    async getLeaderboard(query: ContributionLeaderboardQueryDto) {
        const limit = Math.min(query.limit ?? 50, 100);
        const sortBy: ContributionSortField = query.sortBy ?? "combined";
        const allowedCapLevels = query.minCapLevel
            ? capLevelsAtOrAbove(query.minCapLevel)
            : undefined;

        const [metricsRows, mentoringGroups, endorsementGroups] = await Promise.all([
            this.prisma.userMetrics.findMany({
                where: { lifetimeVerifiedVolunteerHours: { gt: 0 } },
                select: {
                    userId: true,
                    lifetimeVerifiedVolunteerHours: true,
                },
            }),
            this.prisma.volunteerHour.groupBy({
                by: ["loggedByUserId"],
                where: {
                    verificationStatus: VolunteerHourVerificationStatus.VERIFIED,
                    contributionType: ContributionType.MENTORING,
                },
                _sum: { hours: true },
            }),
            this.prisma.endorsement.groupBy({
                by: ["toUserId"],
                _count: { _all: true },
            }),
        ]);

        const signalsByUser = new Map<string, ContributionSignals>();

        const ensure = (userId: string): ContributionSignals => {
            const existing = signalsByUser.get(userId);
            if (existing) {
                return existing;
            }
            const created: ContributionSignals = {
                verifiedHours: 0,
                verifiedMentoringHours: 0,
                endorsementsReceived: 0,
            };
            signalsByUser.set(userId, created);
            return created;
        };

        for (const row of metricsRows) {
            const entry = ensure(row.userId);
            entry.verifiedHours = roundHours(row.lifetimeVerifiedVolunteerHours);
        }

        for (const row of mentoringGroups) {
            const entry = ensure(row.loggedByUserId);
            entry.verifiedMentoringHours = roundHours(row._sum.hours ?? 0);
        }

        for (const row of endorsementGroups) {
            const entry = ensure(row.toUserId);
            entry.endorsementsReceived = row._count._all;
        }

        const userIds = [...signalsByUser.keys()];
        if (!userIds.length) {
            return this.emptyResponse(sortBy, limit, query.minCapLevel);
        }

        const users = await this.prisma.user.findMany({
            where: {
                id: { in: userIds },
                profile: { isNot: null },
                ...(allowedCapLevels ? { capLevel: { in: allowedCapLevels } } : {}),
            },
            select: {
                id: true,
                capLevel: true,
                profile: {
                    select: {
                        name: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        const entries: LeaderboardEntry[] = [];
        for (const user of users) {
            if (!user.profile) {
                continue;
            }
            const signals = signalsByUser.get(user.id)!;
            if (
                signals.verifiedHours <= 0 &&
                signals.verifiedMentoringHours <= 0 &&
                signals.endorsementsReceived <= 0
            ) {
                continue;
            }

            entries.push({
                userId: user.id,
                capLevel: user.capLevel,
                profile: user.profile,
                ...signals,
            });
        }

        entries.sort((a, b) => {
            const diff =
                contributionSortValue(b, sortBy) - contributionSortValue(a, sortBy);
            if (diff !== 0) {
                return diff;
            }
            return b.verifiedHours - a.verifiedHours;
        });

        const items = entries.slice(0, limit).map((entry, index) => ({
            rank: index + 1,
            userId: entry.userId,
            profile: entry.profile,
            cap: {
                level: entry.capLevel,
                label: capDisplayLabel(entry.capLevel),
            },
            contribution: {
                verifiedHours: entry.verifiedHours,
                verifiedMentoringHours: entry.verifiedMentoringHours,
                endorsementsReceived: entry.endorsementsReceived,
                score: computeContributionScore(entry),
            },
        }));

        return {
            items,
            ranking: {
                basis: "contribution_only",
                sortBy,
                excludes: [...CONTRIBUTION_LEADERBOARD_EXCLUDES],
                weights:
                    sortBy === "combined"
                        ? {
                              verifiedHours: 10,
                              verifiedMentoringHours: 15,
                              endorsementsReceived: 20,
                          }
                        : null,
            },
            pagination: {
                limit,
                returned: items.length,
                eligibleUsers: entries.length,
            },
            filters: {
                minCapLevel: query.minCapLevel ?? null,
            },
            generatedAt: new Date().toISOString(),
        };
    }

    private emptyResponse(
        sortBy: ContributionSortField,
        limit: number,
        minCapLevel?: CapLevel,
    ) {
        return {
            items: [],
            ranking: {
                basis: "contribution_only",
                sortBy,
                excludes: [...CONTRIBUTION_LEADERBOARD_EXCLUDES],
                weights:
                    sortBy === "combined"
                        ? {
                              verifiedHours: 10,
                              verifiedMentoringHours: 15,
                              endorsementsReceived: 20,
                          }
                        : null,
            },
            pagination: { limit, returned: 0, eligibleUsers: 0 },
            filters: { minCapLevel: minCapLevel ?? null },
            generatedAt: new Date().toISOString(),
        };
    }
}

function roundHours(value: number): number {
    return Math.round(value * 100) / 100;
}
