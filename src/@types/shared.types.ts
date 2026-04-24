import { AuthProvider, CapLevel, Role } from "@constants/enums";
import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";

export type MakeRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export interface TUser {
    userId: string;
    email: string;
    role: Role;
}

export interface VerifiedUser {
    id: string;
    email: string;
    authProvider: AuthProvider;
    isVerified: boolean;
    role: Role;
    capLevel: CapLevel;
    createdAt: Date | string;
    updatedAt: Date | string;
    userId: string;
}

export type HelperTx = Omit<
    PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;
export interface PaginatedResult<T> {
    data: T[];
    nextCursor?: string;
}
