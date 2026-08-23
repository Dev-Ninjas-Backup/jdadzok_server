import { CapLevel } from "@prisma/client";
import { effectiveVolunteerHours } from "./volunteer-hour.util";

/** Ascending Cap ladder for minimum-level filters. */
export const CAP_LEVEL_ORDER: CapLevel[] = [
    CapLevel.NONE,
    CapLevel.GREEN,
    CapLevel.YELLOW,
    CapLevel.RED,
    CapLevel.BLACK,
    CapLevel.SKY_BLUE,
];

const CAP_LEVEL_WEIGHT: Record<CapLevel, number> = {
    SKY_BLUE: 600,
    BLACK: 500,
    RED: 400,
    YELLOW: 300,
    GREEN: 200,
    NONE: 100,
};

export function capLevelsAtOrAbove(minCapLevel: CapLevel): CapLevel[] {
    const index = CAP_LEVEL_ORDER.indexOf(minCapLevel);
    if (index < 0) {
        return CAP_LEVEL_ORDER;
    }
    return CAP_LEVEL_ORDER.slice(index);
}

export function computeReputationRank(input: {
    capLevel: CapLevel;
    metrics?: {
        lifetimeVerifiedVolunteerHours?: number | null;
        volunteerHours?: number | null;
        activityScore?: number | null;
    } | null;
}): number {
    const hours = effectiveVolunteerHours(input.metrics ?? {});
    const activity = input.metrics?.activityScore ?? 0;

    return (
        CAP_LEVEL_WEIGHT[input.capLevel] +
        hours * 10 +
        activity * 5
    );
}

export function sortByReputationRank<T extends { reputationRank: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => b.reputationRank - a.reputationRank);
}
