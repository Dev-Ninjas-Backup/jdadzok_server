import { CapLevel, CapRequirements, UserMetrics } from "@prisma/client";
import { capDisplayLabel, capEarningLevelHeadline } from "@common/utils/cap-earning-headline.util";

interface CapEarningSnapshot {
    effectiveSharePercentage: number;
    nominalSharePercentage: number;
    earningAtRedRate: boolean;
    blackVolunteerHoursRequired: number | null;
}

interface CapStatusForSoftMapping {
    user: { id: string };
    currentLevel: CapLevel;
    nextLevel: CapLevel | null;
    progressPercentage: number;
    eligibility: unknown;
    earning: CapEarningSnapshot;
    currentRequirements: CapRequirements | null;
    nextRequirements: CapRequirements | null;
    metrics: UserMetrics | null;
}

export function sanitizeCapRequirementsForPublic(
    requirements: CapRequirements | null,
): Omit<CapRequirements, "adSharePercentage"> | null {
    if (!requirements) {
        return null;
    }
    const { adSharePercentage: _removed, ...rest } = requirements;
    return rest;
}

export function toPublicEarningLevel(capLevel: CapLevel, options?: { earningAtRedRate?: boolean }) {
    return {
        headline: capEarningLevelHeadline(capLevel),
        capLabel: capDisplayLabel(capLevel),
        ...(options?.earningAtRedRate
            ? {
                  note: "Earning at mentor tier until Black-level verified hours are met",
              }
            : {}),
    };
}

export function toPrivateEarningsBlock(
    status: Pick<
        CapStatusForSoftMapping,
        "earning" | "currentRequirements" | "nextRequirements" | "metrics"
    >,
) {
    const metrics = status.metrics;
    return {
        effectiveSharePercentage: status.earning.effectiveSharePercentage,
        nominalSharePercentage: status.earning.nominalSharePercentage,
        earningAtRedRate: status.earning.earningAtRedRate,
        blackVolunteerHoursRequired: status.earning.blackVolunteerHoursRequired,
        currentTierSharePercent: status.currentRequirements?.adSharePercentage ?? null,
        nextTierSharePercent: status.nextRequirements?.adSharePercentage ?? null,
        totalEarnings: metrics?.totalEarnings ?? 0,
        currentMonthEarnings: metrics?.currentMonthEarnings ?? 0,
    };
}

/** Personal dashboard view — soft headlines plus exact figures under privateEarnings. */
export function mapCapStatusForPersonalDashboard(status: CapStatusForSoftMapping) {
    return {
        userId: status.user.id,
        currentLevel: status.currentLevel,
        nextLevel: status.nextLevel,
        progressPercentage: status.progressPercentage,
        eligibility: status.eligibility,
        earningLevel: toPublicEarningLevel(status.currentLevel, {
            earningAtRedRate: status.earning.earningAtRedRate,
        }),
        currentRequirements: sanitizeCapRequirementsForPublic(status.currentRequirements),
        nextRequirements: sanitizeCapRequirementsForPublic(status.nextRequirements),
        metrics: {
            activityScore: status.metrics?.activityScore ?? 0,
            volunteerHours: status.metrics?.volunteerHours ?? 0,
            lifetimeVerifiedVolunteerHours: status.metrics?.lifetimeVerifiedVolunteerHours ?? 0,
            completedProjects: status.metrics?.completedProjects ?? 0,
        },
        privateEarnings: toPrivateEarningsBlock(status),
    };
}

/** Admin / internal — retains raw percentages. */
export function mapCapStatusForAdmin(status: CapStatusForSoftMapping) {
    return status;
}

export function sanitizeUserMetricsForViewer<T extends Record<string, unknown>>(
    metrics: T,
    viewerUserId: string,
    subjectUserId: string,
    capLevel?: CapLevel,
) {
    const isOwnProfile = viewerUserId === subjectUserId;
    if (isOwnProfile) {
        return metrics;
    }

    const { totalEarnings: _te, currentMonthEarnings: _cme, seller: _seller, ...rest } = metrics;

    return {
        ...rest,
        ...(capLevel ? { earningLevel: toPublicEarningLevel(capLevel) } : {}),
    };
}

export function stripForbiddenEarningsFields<T extends Record<string, unknown>>(payload: T): T {
    const clone = { ...payload };
    for (const key of [
        "effectiveSharePercentage",
        "nominalSharePercentage",
        "adSharePercentage",
        "sharePercentage",
        "totalEarnings",
        "currentMonthEarnings",
    ]) {
        if (key in clone) {
            delete clone[key];
        }
    }
    return clone;
}
