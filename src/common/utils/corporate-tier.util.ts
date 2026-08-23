import { MembershipTier } from "@prisma/client";

/** June 26 corporate landing tier names (renamed from Silver / Gold / Platinum). */
export const CORPORATE_TIER_ORDER: MembershipTier[] = [
    MembershipTier.STARTER,
    MembershipTier.GROWTH,
    MembershipTier.ENTERPRISE,
];

export const LEGACY_TIER_LABELS: Record<MembershipTier, string> = {
    STARTER: "Silver (legacy)",
    GROWTH: "Gold (legacy)",
    ENTERPRISE: "Platinum (legacy)",
};

export const CORPORATE_TIER_CATALOG: Record<
    MembershipTier,
    {
        label: string;
        legacyLabel: string;
        dailyAdsLimit: number;
        sponsorshipsLimit: number;
        talentUnlocksLimit: number;
        talentSearchResultLimit: number;
        esgReporting: boolean;
    }
> = {
    STARTER: {
        label: "Starter",
        legacyLabel: "Silver",
        dailyAdsLimit: 5,
        sponsorshipsLimit: 1,
        talentUnlocksLimit: 3,
        talentSearchResultLimit: 10,
        esgReporting: false,
    },
    GROWTH: {
        label: "Growth",
        legacyLabel: "Gold",
        dailyAdsLimit: 20,
        sponsorshipsLimit: 5,
        talentUnlocksLimit: 15,
        talentSearchResultLimit: 25,
        esgReporting: true,
    },
    ENTERPRISE: {
        label: "Enterprise",
        legacyLabel: "Platinum",
        dailyAdsLimit: 100,
        sponsorshipsLimit: 25,
        talentUnlocksLimit: 100,
        talentSearchResultLimit: 50,
        esgReporting: true,
    },
};

/** Valid UN SDG goal numbers for alignment arrays. */
export const SDG_GOAL_MIN = 1;
export const SDG_GOAL_MAX = 17;

export function assertValidSdgGoals(goals: number[]): void {
    const invalid = goals.filter((g) => g < SDG_GOAL_MIN || g > SDG_GOAL_MAX || !Number.isInteger(g));
    if (invalid.length) {
        throw new Error(`Invalid SDG goal numbers (must be integers ${SDG_GOAL_MIN}–${SDG_GOAL_MAX}): ${invalid.join(", ")}`);
    }
}
