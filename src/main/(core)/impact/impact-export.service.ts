import { PrismaService } from "@lib/prisma/prisma.service";
import { ForbiddenException, Injectable } from "@nestjs/common";
import {
    Prisma,
    Role,
    VolunteerHourVerificationStatus,
} from "@prisma/client";
import { CORPORATE_TIER_CATALOG } from "@common/utils/corporate-tier.util";
import {
    aggregateHoursByKey,
    aggregateSdgGoals,
    applyKAnonymity,
    coarseRegion,
    DEFAULT_IMPACT_K_ANONYMITY,
    maybeDistinctTotal,
} from "@common/utils/impact-anonymise.util";
import { ImpactExportQueryDto } from "./dto/impact-export.dto";

type ExportAccess = "admin" | "corporate" | "ngo";

@Injectable()
export class ImpactExportService {
    constructor(private readonly prisma: PrismaService) {}

    async getSummary(userId: string, role: Role, query: ImpactExportQueryDto = {}) {
        const access = await this.assertExportAccess(userId, role);
        const minBucketSize = query.minBucketSize ?? DEFAULT_IMPACT_K_ANONYMITY;
        const verifiedWhere = this.buildVerifiedHoursWhere(query);

        const [
            verifiedHoursAgg,
            verifiedMentoringHours,
            activeVolunteerProjects,
            openBridgeListings,
            distinctVolunteers,
        ] = await Promise.all([
            this.prisma.volunteerHour.aggregate({
                where: verifiedWhere,
                _sum: { hours: true },
                _count: true,
            }),
            this.prisma.volunteerHour.aggregate({
                where: {
                    ...verifiedWhere,
                    contributionType: "MENTORING",
                },
                _sum: { hours: true },
            }),
            this.prisma.volunteerProject.count({ where: { isActive: true } }),
            this.prisma.bridgeListing.count({ where: { status: "OPEN" } }),
            this.prisma.volunteerHour.groupBy({
                by: ["loggedByUserId"],
                where: verifiedWhere,
            }),
        ]);

        await this.logExport(userId, "SUMMARY", query);

        return {
            access,
            generatedAt: new Date().toISOString(),
            period: this.buildPeriod(query),
            anonymisation: this.anonymisationPolicy(minBucketSize),
            totals: {
                verifiedHours: roundHours(verifiedHoursAgg._sum.hours ?? 0),
                verifiedHourEntries: verifiedHoursAgg._count,
                distinctVolunteers: maybeDistinctTotal(distinctVolunteers.length, minBucketSize),
                verifiedMentoringHours: roundHours(verifiedMentoringHours._sum.hours ?? 0),
                activeVolunteerProjects,
                openBridgeListings,
            },
            note: "Aggregated platform impact only — no individual identities, earnings, or private member data.",
        };
    }

    async getBreakdown(userId: string, role: Role, query: ImpactExportQueryDto = {}) {
        const access = await this.assertExportAccess(userId, role);
        const minBucketSize = query.minBucketSize ?? DEFAULT_IMPACT_K_ANONYMITY;
        const verifiedWhere = this.buildVerifiedHoursWhere(query);

        const verifiedHours = await this.prisma.volunteerHour.findMany({
            where: verifiedWhere,
            select: {
                hours: true,
                loggedByUserId: true,
                contributionType: true,
                createdAt: true,
                loggedByUser: { select: { capLevel: true } },
                application: {
                    select: {
                        project: { select: { location: true } },
                    },
                },
            },
        });

        const contributionRows = verifiedHours.map((row) => ({
            key: row.contributionType ?? "UNSPECIFIED",
            hours: row.hours,
            subjectId: row.loggedByUserId,
        }));
        const capRows = verifiedHours.map((row) => ({
            key: row.loggedByUser.capLevel,
            hours: row.hours,
            subjectId: row.loggedByUserId,
        }));
        const regionRows = verifiedHours.map((row) => ({
            key: coarseRegion(row.application?.project?.location),
            hours: row.hours,
            subjectId: row.loggedByUserId,
        }));
        const monthRows = verifiedHours.map((row) => ({
            key: row.createdAt.toISOString().slice(0, 7),
            hours: row.hours,
            subjectId: row.loggedByUserId,
        }));

        const corporateGoals = await this.prisma.corporateMembership.findMany({
            where: { isActive: true },
            select: { sdgAlignmentGoals: true },
        });

        await this.logExport(userId, "BREAKDOWN", query);

        return {
            access,
            generatedAt: new Date().toISOString(),
            period: this.buildPeriod(query),
            anonymisation: this.anonymisationPolicy(minBucketSize),
            byContributionType: applyKAnonymity(
                aggregateHoursByKey(contributionRows),
                minBucketSize,
            ),
            byCapLevel: applyKAnonymity(aggregateHoursByKey(capRows), minBucketSize),
            byRegion: applyKAnonymity(aggregateHoursByKey(regionRows), minBucketSize),
            byMonth: applyKAnonymity(aggregateHoursByKey(monthRows), minBucketSize).map(
                (bucket) =>
                    "suppressed" in bucket
                        ? bucket
                        : { ...bucket, key: bucket.key },
            ),
            sdgAlignment: aggregateSdgGoals(
                corporateGoals.map((row) => row.sdgAlignmentGoals),
                minBucketSize,
            ),
            note: "Buckets with fewer than k distinct subjects are suppressed to protect member privacy.",
        };
    }

    private buildVerifiedHoursWhere(query: ImpactExportQueryDto): Prisma.VolunteerHourWhereInput {
        const createdAt: Prisma.DateTimeFilter = {};
        if (query.fromDate) {
            createdAt.gte = new Date(query.fromDate);
        }
        if (query.toDate) {
            createdAt.lt = new Date(query.toDate);
        }

        return {
            verificationStatus: VolunteerHourVerificationStatus.VERIFIED,
            ...(Object.keys(createdAt).length ? { createdAt } : {}),
        };
    }

    private buildPeriod(query: ImpactExportQueryDto) {
        return {
            from: query.fromDate ?? null,
            to: query.toDate ?? null,
        };
    }

    private anonymisationPolicy(minBucketSize: number) {
        return {
            kAnonymityMinBucketSize: minBucketSize,
            policy:
                "Export buckets include aggregated hours and subject counts only. Buckets below the k threshold are suppressed.",
            excludedFields: [
                "userId",
                "email",
                "exactEarnings",
                "privateChat",
                "organisationNames",
            ],
        };
    }

    private async assertExportAccess(userId: string, role: Role): Promise<ExportAccess> {
        if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
            return "admin";
        }

        const membership = await this.prisma.corporateMembership.findFirst({
            where: { contactPersonId: userId, isActive: true },
        });
        if (
            membership &&
            CORPORATE_TIER_CATALOG[membership.tier].impactDataExport
        ) {
            return "corporate";
        }

        const ngo = await this.prisma.ngo.findFirst({
            where: { ownerId: userId, isVerified: true },
        });
        if (ngo) {
            return "ngo";
        }

        throw new ForbiddenException(
            "Impact-data export requires admin access, verified NGO ownership, or Growth/Enterprise corporate membership",
        );
    }

    private async logExport(
        userId: string,
        exportType: string,
        query: ImpactExportQueryDto,
    ) {
        await this.prisma.impactDataExportLog.create({
            data: {
                requestedByUserId: userId,
                exportType,
                filters: query as Prisma.InputJsonValue,
            },
        });
    }
}

function roundHours(value: number): number {
    return Math.round(value * 100) / 100;
}
