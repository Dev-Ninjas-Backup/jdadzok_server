import { capLevel, CapLevel } from "@constants/enums";
import { CapLevel as PrismaCapLevel, Role } from "@prisma/client";

/** Sequential ladder rungs — Sky Blue is a parallel invitation track, not on this ladder. */
export const CAP_LADDER_ORDER: CapLevel[] = ["NONE", "GREEN", "YELLOW", "RED", "BLACK"];

export function capLevelIndex(level: PrismaCapLevel): number {
    if (level === "SKY_BLUE") {
        return CAP_LADDER_ORDER.indexOf("BLACK");
    }
    return CAP_LADDER_ORDER.indexOf(level as CapLevel);
}

export function getNextLadderLevel(current: PrismaCapLevel): CapLevel | null {
    if (current === "SKY_BLUE") {
        return null;
    }
    const index = CAP_LADDER_ORDER.indexOf(current as CapLevel);
    if (index === -1 || index >= CAP_LADDER_ORDER.length - 1) {
        return null;
    }
    return CAP_LADDER_ORDER[index + 1];
}

export function isSequentialPromotion(from: PrismaCapLevel, to: PrismaCapLevel): boolean {
    if (to === "SKY_BLUE") {
        return false;
    }
    const fromIndex = capLevelIndex(from);
    const toIndex = capLevelIndex(to as CapLevel);
    return toIndex === fromIndex + 1;
}

export function isCapLevelHigher(
    endorserLevel: PrismaCapLevel,
    subjectLevel: PrismaCapLevel,
): boolean {
    return capLevel.indexOf(endorserLevel as CapLevel) > capLevel.indexOf(subjectLevel as CapLevel);
}

export function isPlatformAdmin(role: Role): boolean {
    return role === Role.ADMIN || role === Role.SUPER_ADMIN || role === Role.MODERATOR;
}
