import { CapLevel } from "@prisma/client";

/** Weights live in the admin-editable `activity-score` table; these apply until a row exists. */
export interface ImpactScoreWeights {
    post: number;
    comment: number;
    like: number;
    share: number;
    follower: number;
    endorsement: number;
    verifiedVolunteerHour: number;
    popularityCap: number;
    endorserLevelBonus: number;
}

/** Placeholders until the client sends final figures. */
export const DEFAULT_IMPACT_SCORE_WEIGHTS: ImpactScoreWeights = {
    post: 1,
    comment: 0.5,
    like: 0,
    share: 0.5,
    follower: 0,
    endorsement: 10,
    verifiedVolunteerHour: 2,
    popularityCap: 30,
    endorserLevelBonus: 0.5,
};

export interface ImpactScoreInput {
    posts: number;
    comments: number;
    likesGiven: number;
    shares: number;
    followers: number;
    /** Sum of endorser multipliers, see sumEndorsementPoints */
    endorsementPoints: number;
    verifiedHours: number;
}

export interface ImpactScoreBreakdown {
    popularityPoints: number;
    endorsementPoints: number;
    volunteerPoints: number;
    total: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

export function calculateImpactScore(
    input: ImpactScoreInput,
    weights: ImpactScoreWeights,
): ImpactScoreBreakdown {
    const popularityRaw =
        input.posts * weights.post +
        input.comments * weights.comment +
        input.likesGiven * weights.like +
        input.shares * weights.share +
        input.followers * weights.follower;

    const popularityPoints = Math.min(popularityRaw, weights.popularityCap);
    const endorsementPoints = input.endorsementPoints * weights.endorsement;
    const volunteerPoints = input.verifiedHours * weights.verifiedVolunteerHour;

    return {
        popularityPoints: round2(popularityPoints),
        endorsementPoints: round2(endorsementPoints),
        volunteerPoints: round2(volunteerPoints),
        total: round2(popularityPoints + endorsementPoints + volunteerPoints),
    };
}

/** Ladder rung of an endorser; members without a level (NONE) cannot lift anyone's score. */
const ENDORSER_RUNG: Partial<Record<CapLevel, number>> = {
    GREEN: 0,
    YELLOW: 1,
    RED: 2,
    BLACK: 3,
    SKY_BLUE: 3,
};

export function endorserMultiplier(level: CapLevel, levelBonus: number): number {
    const rung = ENDORSER_RUNG[level];
    return rung === undefined ? 0 : 1 + levelBonus * rung;
}

/**
 * One count per distinct endorser (repeat endorsements add nothing), at the weight of the
 * endorser's level. Endorsers the member endorsed back are ignored, so swapping endorsements
 * cannot inflate two scores.
 */
export function sumEndorsementPoints(
    endorsers: { fromUserId: string; level: CapLevel }[],
    reciprocalUserIds: ReadonlySet<string>,
    levelBonus: number,
): number {
    const best = new Map<string, number>();
    for (const { fromUserId, level } of endorsers) {
        if (reciprocalUserIds.has(fromUserId)) continue;
        const multiplier = endorserMultiplier(level, levelBonus);
        best.set(fromUserId, Math.max(best.get(fromUserId) ?? 0, multiplier));
    }
    let total = 0;
    for (const multiplier of best.values()) total += multiplier;
    return total;
}
