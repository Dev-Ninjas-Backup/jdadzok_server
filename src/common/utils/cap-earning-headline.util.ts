import { CapLevel } from "@prisma/client";

/** Soft-language earning tier headlines for public profile passport (no raw ad-share %). */
const EARNING_HEADLINE_BY_CAP: Record<CapLevel, string> = {
    NONE: "Community starter",
    GREEN: "Community starter",
    YELLOW: "Rising contributor",
    RED: "Trusted mentor",
    BLACK: "Senior impact leader",
    SKY_BLUE: "Distinguished ambassador",
};

const CAP_DISPLAY_LABEL: Record<CapLevel, string> = {
    NONE: "No Cap",
    GREEN: "Green Cap",
    YELLOW: "Yellow Cap",
    RED: "Red Cap",
    BLACK: "Black Cap",
    SKY_BLUE: "Sky Blue Cap",
};

export function capEarningLevelHeadline(capLevel: CapLevel): string {
    return EARNING_HEADLINE_BY_CAP[capLevel] ?? EARNING_HEADLINE_BY_CAP.GREEN;
}

export function capDisplayLabel(capLevel: CapLevel): string {
    return CAP_DISPLAY_LABEL[capLevel] ?? CAP_DISPLAY_LABEL.GREEN;
}
