import { BadRequestException } from "@nestjs/common";

/** Canonical slug for the app-wide “Other” interest / filter escape hatch */
export const OTHER_CHOICE_SLUG = "other";

/**
 * When a typed category is OTHER (or an “Other” choice is selected), free-text is required.
 * Clears unused otherText when not OTHER.
 */
export function resolveOtherText(params: {
    isOther: boolean;
    otherText?: string | null;
    label?: string;
}): string | null {
    const label = params.label ?? "Other";
    const trimmed = params.otherText?.trim() || null;

    if (params.isOther) {
        if (!trimmed) {
            throw new BadRequestException(`${label} free-text is required when selecting Other`);
        }
        return trimmed;
    }

    return null;
}

export function isContributionOther(type: string | null | undefined): boolean {
    return type === "OTHER";
}
