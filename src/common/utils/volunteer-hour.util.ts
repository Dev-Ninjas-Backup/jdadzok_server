import { ContributionType } from "@prisma/client";

/** Mentoring / advice sessions require the mentee (counterparty) to confirm before Cap credit. */
export const COUNTERPARTY_CONTRIBUTION_TYPES: ContributionType[] = [
    ContributionType.MENTORING,
    ContributionType.ADVICE,
];

export function requiresCounterpartyConfirmation(type: ContributionType): boolean {
    return COUNTERPARTY_CONTRIBUTION_TYPES.includes(type);
}

export function counterpartyConfirmationComplete(hour: {
    contributionType: ContributionType | null;
    counterpartyConfirmedAt: Date | null;
}): boolean {
    if (!hour.contributionType || !requiresCounterpartyConfirmation(hour.contributionType)) {
        return true;
    }
    return hour.counterpartyConfirmedAt != null;
}

/** Lifetime verified hours bank — prefer aggregated float, fall back to legacy int counter. */
export function effectiveVolunteerHours(metrics: {
    lifetimeVerifiedVolunteerHours?: number | null;
    volunteerHours?: number | null;
}): number {
    if (
        metrics.lifetimeVerifiedVolunteerHours != null &&
        metrics.lifetimeVerifiedVolunteerHours > 0
    ) {
        return metrics.lifetimeVerifiedVolunteerHours;
    }
    return metrics.volunteerHours ?? 0;
}
