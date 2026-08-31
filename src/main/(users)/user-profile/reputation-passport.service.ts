import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ContributionType, VolunteerHourVerificationStatus } from "@prisma/client";
import { effectiveVolunteerHours } from "@common/utils/volunteer-hour.util";
import { capDisplayLabel, capEarningLevelHeadline } from "@common/utils/cap-earning-headline.util";

@Injectable()
export class ReputationPassportService {
    constructor(private readonly prisma: PrismaService) {}

    async getPassport(targetUserId: string, viewerUserId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            include: {
                profile: {
                    select: {
                        name: true,
                        username: true,
                        title: true,
                        avatarUrl: true,
                        capArtStyle: true,
                        capArtPlacement: true,
                        isVolunteerMentorOptIn: true,
                    },
                },
                metrics: true,
            },
        });

        if (!user?.profile) {
            throw new NotFoundException("User profile not found");
        }

        const isOwnProfile = viewerUserId === targetUserId;
        const bankHours = effectiveVolunteerHours(user.metrics ?? {});
        const menteesCount = await this.countDistinctMentees(targetUserId);

        const passport = {
            userId: targetUserId,
            profile: {
                name: user.profile.name,
                username: user.profile.username,
                title: user.profile.title,
                avatarUrl: user.profile.avatarUrl,
            },
            cap: {
                level: user.capLevel,
                label: capDisplayLabel(user.capLevel),
                artStyle: user.profile.capArtStyle,
                artPlacement: user.profile.capArtPlacement,
            },
            impactScore: Math.round((user.metrics?.activityScore ?? 0) * 100) / 100,
            volunteerHours: {
                lifetimeVerified: bankHours,
                lifetimeVerifiedRounded: Math.ceil(bankHours),
            },
            menteesCount,
            earningLevel: {
                headline: capEarningLevelHeadline(user.capLevel),
            },
            isVolunteerMentorOptIn: user.profile.isVolunteerMentorOptIn,
            isOwnProfile,
        };

        if (!isOwnProfile) {
            return passport;
        }

        return {
            ...passport,
            privateSummary: {
                totalEarnings: user.metrics?.totalEarnings ?? 0,
                currentMonthEarnings: user.metrics?.currentMonthEarnings ?? 0,
                completedProjects: user.metrics?.completedProjects ?? 0,
            },
        };
    }

    /** Distinct mentees with at least one verified mentoring hour logged by this member. */
    private async countDistinctMentees(mentorUserId: string): Promise<number> {
        const groups = await this.prisma.volunteerHour.groupBy({
            by: ["counterpartyUserId"],
            where: {
                loggedByUserId: mentorUserId,
                contributionType: ContributionType.MENTORING,
                verificationStatus: VolunteerHourVerificationStatus.VERIFIED,
                counterpartyUserId: { not: null },
            },
        });
        return groups.length;
    }
}
