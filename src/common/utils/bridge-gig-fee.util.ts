/** Default platform cut on Bridge paid gigs (June 26 — small fee on worker payout). */
export const DEFAULT_BRIDGE_GIG_FEE_PERCENT = 5;

export type BridgeGigFeeBreakdown = {
    grossAmount: number;
    platformFeePercent: number;
    platformFeeAmount: number;
    providerPayoutAmount: number;
    currency: string;
};

export function computeBridgeGigFee(
    grossAmount: number,
    platformFeePercent: number,
    currency = "USD",
): BridgeGigFeeBreakdown {
    const feePercent = Math.min(Math.max(platformFeePercent, 0), 100);
    const platformFeeAmount = roundMoney((grossAmount * feePercent) / 100);
    const providerPayoutAmount = roundMoney(grossAmount - platformFeeAmount);

    return {
        grossAmount: roundMoney(grossAmount),
        platformFeePercent: feePercent,
        platformFeeAmount,
        providerPayoutAmount,
        currency,
    };
}

function roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
}
