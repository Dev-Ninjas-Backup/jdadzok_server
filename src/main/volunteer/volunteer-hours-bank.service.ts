import { Injectable } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { CapLevel, UserMetrics, VolunteerHourVerificationStatus } from "@prisma/client";
import { effectiveVolunteerHours } from "@common/utils/volunteer-hour.util";

export { effectiveVolunteerHours };

@Injectable()
export class VolunteerHoursBankService {
    constructor(private readonly prisma: PrismaService) {}

    /** Sum verified hours across all projects and mentorship calls for a member. */
    async computeVerifiedTotal(userId: string): Promise<number> {
        const result = await this.prisma.volunteerHour.aggregate({
            where: {
                loggedByUserId: userId,
                verificationStatus: VolunteerHourVerificationStatus.VERIFIED,
            },
            _sum: { hours: true },
        });
        return Math.round((result._sum.hours ?? 0) * 100) / 100;
    }

    /** Recompute lifetime bank from VolunteerHour source of truth and sync UserMetrics. */
    async syncLifetimeBank(userId: string): Promise<UserMetrics> {
        const total = await this.computeVerifiedTotal(userId);

        return this.prisma.userMetrics.upsert({
            where: { userId },
            update: {
                lifetimeVerifiedVolunteerHours: total,
                volunteerHours: Math.ceil(total),
                lastUpdated: new Date(),
            },
            create: {
                userId,
                lifetimeVerifiedVolunteerHours: total,
                volunteerHours: Math.ceil(total),
            },
        });
    }

    async getBankStatus(userId: string) {
        const metrics = await this.prisma.userMetrics.findUnique({ where: { userId } });
        const lifetimeTotal = metrics
            ? effectiveVolunteerHours(metrics)
            : await this.computeVerifiedTotal(userId);

        const blackReq = await this.prisma.capRequirements.findUnique({
            where: { capLevel: CapLevel.BLACK },
        });
        const threshold = blackReq?.minVolunteerHours ?? 320;

        const byProject = await this.prisma.volunteerHour.groupBy({
            by: ["applicationId"],
            where: {
                loggedByUserId: userId,
                verificationStatus: VolunteerHourVerificationStatus.VERIFIED,
                applicationId: { not: null },
            },
            _sum: { hours: true },
        });

        const applicationIds = byProject
            .map((row) => row.applicationId)
            .filter((id): id is string => id != null);

        const applications = applicationIds.length
            ? await this.prisma.volunteerApplication.findMany({
                  where: { id: { in: applicationIds } },
                  select: {
                      id: true,
                      projectId: true,
                      project: { select: { id: true, title: true } },
                  },
              })
            : [];

        const projectMap = new Map(applications.map((a) => [a.id, a.project]));

        const projectBreakdown = byProject.map((row) => ({
            applicationId: row.applicationId,
            project: row.applicationId ? projectMap.get(row.applicationId) ?? null : null,
            verifiedHours: Math.round((row._sum.hours ?? 0) * 100) / 100,
        }));

        const nonProjectHours = await this.prisma.volunteerHour.aggregate({
            where: {
                loggedByUserId: userId,
                verificationStatus: VolunteerHourVerificationStatus.VERIFIED,
                applicationId: null,
            },
            _sum: { hours: true },
        });

        return {
            lifetimeVerifiedHours: lifetimeTotal,
            lifetimeVerifiedHoursRounded: Math.ceil(lifetimeTotal),
            blackThresholdHours: threshold,
            hoursRemainingForBlack: Math.max(0, threshold - Math.ceil(lifetimeTotal)),
            progressPercent: Math.min(100, Math.round((lifetimeTotal / threshold) * 100)),
            projectBreakdown,
            otherVerifiedHours: Math.round((nonProjectHours._sum.hours ?? 0) * 100) / 100,
            note: "Lifetime bank aggregates verified hours across all projects and calls; feeds Black Cap threshold.",
        };
    }
}
