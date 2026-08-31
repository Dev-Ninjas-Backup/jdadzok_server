/** Minimum distinct subjects in a bucket before it may appear in exports (k-anonymity). */
export const DEFAULT_IMPACT_K_ANONYMITY = 5;

export interface ImpactBucket {
    key: string;
    hours: number;
    subjectCount: number;
}

export type AnonymisedImpactBucket =
    | {
          key: string;
          hours: number;
          subjectCount: number;
      }
    | {
          key: string;
          suppressed: true;
          reason: "k_anonymity";
      };

export function coarseRegion(location: string | null | undefined): string {
    if (!location?.trim()) {
        return "unspecified";
    }
    const trimmed = location.trim();
    const parts = trimmed
        .split(/[,;/|]/)
        .map((p) => p.trim())
        .filter(Boolean);
    if (parts.length >= 2) {
        return parts[parts.length - 1].toLowerCase();
    }
    return trimmed.toLowerCase();
}

export function applyKAnonymity(
    buckets: ImpactBucket[],
    minSize = DEFAULT_IMPACT_K_ANONYMITY,
): AnonymisedImpactBucket[] {
    return buckets.map((bucket) => {
        if (bucket.subjectCount < minSize) {
            return {
                key: bucket.key,
                suppressed: true as const,
                reason: "k_anonymity" as const,
            };
        }
        return {
            key: bucket.key,
            hours: roundHours(bucket.hours),
            subjectCount: bucket.subjectCount,
        };
    });
}

export function maybeDistinctTotal(
    count: number,
    minSize = DEFAULT_IMPACT_K_ANONYMITY,
): number | "suppressed" {
    return count < minSize ? "suppressed" : count;
}

function roundHours(value: number): number {
    return Math.round(value * 100) / 100;
}

export function aggregateHoursByKey<T extends string>(
    rows: { key: T; hours: number; subjectId: string }[],
): ImpactBucket[] {
    const map = new Map<string, { hours: number; subjects: Set<string> }>();

    for (const row of rows) {
        const entry = map.get(row.key) ?? { hours: 0, subjects: new Set<string>() };
        entry.hours += row.hours;
        entry.subjects.add(row.subjectId);
        map.set(row.key, entry);
    }

    return [...map.entries()]
        .map(([key, value]) => ({
            key,
            hours: value.hours,
            subjectCount: value.subjects.size,
        }))
        .sort((a, b) => b.hours - a.hours);
}

export function aggregateSdgGoals(
    goalSets: number[][],
    minSize = DEFAULT_IMPACT_K_ANONYMITY,
): { goal: number; alignedOrgCount: number | "suppressed" }[] {
    const counts = new Map<number, number>();
    for (const goals of goalSets) {
        for (const goal of goals) {
            counts.set(goal, (counts.get(goal) ?? 0) + 1);
        }
    }

    return [...counts.entries()]
        .sort(([a], [b]) => a - b)
        .map(([goal, alignedOrgCount]) => ({
            goal,
            alignedOrgCount: alignedOrgCount < minSize ? ("suppressed" as const) : alignedOrgCount,
        }));
}
