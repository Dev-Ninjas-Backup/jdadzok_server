/**
 * Job types for cap level processing
 */
export const withdrawJobType = {
    // User-specific jobs
    WITHDRAW: "withdraw",
} as const;

export type WithdrawJobType = typeof withdrawJobType;
