export interface ContributionSignals {
    verifiedHours: number;
    verifiedMentoringHours: number;
    endorsementsReceived: number;
}

export type ContributionSortField = "combined" | "hours" | "mentorship" | "endorsements";

/** Weights for combined contribution ranking (hours, mentorship, endorsements — not followers). */
const WEIGHTS = {
    verifiedHours: 10,
    verifiedMentoringHours: 15,
    endorsementsReceived: 20,
} as const;

export function computeContributionScore(signals: ContributionSignals): number {
    return (
        signals.verifiedHours * WEIGHTS.verifiedHours +
        signals.verifiedMentoringHours * WEIGHTS.verifiedMentoringHours +
        signals.endorsementsReceived * WEIGHTS.endorsementsReceived
    );
}

export function contributionSortValue(
    signals: ContributionSignals,
    sortBy: ContributionSortField,
): number {
    switch (sortBy) {
        case "hours":
            return signals.verifiedHours;
        case "mentorship":
            return signals.verifiedMentoringHours;
        case "endorsements":
            return signals.endorsementsReceived;
        case "combined":
        default:
            return computeContributionScore(signals);
    }
}

export const CONTRIBUTION_LEADERBOARD_EXCLUDES = [
    "followers",
    "following",
    "activityScore",
    "revenue",
    "totalPosts",
] as const;
