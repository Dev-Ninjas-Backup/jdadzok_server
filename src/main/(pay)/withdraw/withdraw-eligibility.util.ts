import { BadRequestException } from "@nestjs/common";

export const DEFAULT_WITHDRAW_MIN_AMOUNT = 100;

/** Withdraw statuses whose amount is already spent from the profile balance. */
export const COMMITTED_WITHDRAW_STATUSES = ["PENDING", "PROCESSING", "SUCCESS"] as const;

export function resolveMinWithdrawAmount(raw: unknown): number {
    if (raw === undefined || raw === null || raw === "") return DEFAULT_WITHDRAW_MIN_AMOUNT;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error("WITHDRAW_MIN_AMOUNT must be a non-negative number");
    }
    return parsed;
}

interface WithdrawEligibilityInput {
    amount: number;
    balance: number;
    committed: number;
    minAmount: number;
}

/**
 * Profile balance is lifetime earnings and is never debited on payout, so the
 * available amount is the balance minus every withdraw that is still open or paid.
 */
export function assertWithdrawEligible({
    amount,
    balance,
    committed,
    minAmount,
}: WithdrawEligibilityInput): void {
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException("Withdraw amount must be greater than zero");
    }

    if (amount < minAmount) {
        throw new BadRequestException(`Minimum withdraw amount is $${minAmount}`);
    }

    const available = Math.max(0, balance - committed);
    if (amount > available) {
        throw new BadRequestException("Requested amount exceeds available balance");
    }
}
