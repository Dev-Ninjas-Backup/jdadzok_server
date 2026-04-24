import { Role } from "@constants/enums";
import { Request } from "express";

export interface RequestWithUser extends Request {
    user?: UserTokenPayload;
}

export interface JWTPayload {
    sub: string;
    email: string;
    roles: string;
    iat?: number;
    exp?: number;
}

export interface UserTokenPayload {
    roles: Role[];
    email: string;
    userId: string;
    [key: string]: unknown;
}
