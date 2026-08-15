import { CallPurpose } from "@prisma/client";

export class StartCallDto {
    hostUserId: string;
    recipientUserId: string;
    title?: string;
    isPrivate?: boolean;
    callPurpose?: CallPurpose;
}
