/** it's means 5 minute only */
export const RESET_TOKEN_EXPIRES_IN = 1 * 60 * 1000; // 1 minutes

export const CAP_LEVEL_RULES = {
    GREEN: { minScore: 0, promoteAt: 50 },
    YELLOW: { minScore: 50, promoteAt: 100 },
    RED: { minScore: 100, promoteAt: 200, requiresAdmin: true },
    BLACK: { minScore: 200, promoteAt: 300, requiresVolunteer: true },
    OSTRICH_FEATHER: { minScore: 300, promoteAt: 99999, requiresNomination: true },
} as const;
