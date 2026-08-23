import { capLevel, CapLevel } from "@constants/enums";
import { CapLevel as PrismaCapLevel, Role } from "@prisma/client";

export function isCapLevelHigher(
    endorserLevel: PrismaCapLevel,
    subjectLevel: PrismaCapLevel,
): boolean {
    return capLevel.indexOf(endorserLevel as CapLevel) > capLevel.indexOf(subjectLevel as CapLevel);
}

export function isPlatformAdmin(role: Role): boolean {
    return role === Role.ADMIN || role === Role.SUPER_ADMIN || role === Role.MODERATOR;
}
