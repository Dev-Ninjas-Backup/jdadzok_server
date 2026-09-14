import { FirebaseService, IncomingCallPushPayload } from "@lib/firebase/firebase.service";
import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable, Logger } from "@nestjs/common";
import { CallPurpose, NotificationType } from "@prisma/client";

export type PushSkipReason = "not_configured" | "notifications_disabled" | "no_devices";

export interface PushSendOutcome {
    sent: boolean;
    successCount: number;
    failureCount: number;
    skipped?: PushSkipReason;
}

@Injectable()
export class PushNotificationService {
    private readonly logger = new Logger(PushNotificationService.name);

    constructor(
        private readonly firebase: FirebaseService,
        private readonly prisma: PrismaService,
    ) {}

    async sendToUser(
        userId: string,
        input: {
            title: string;
            body: string;
            type?: NotificationType;
            entityId?: string | null;
            notificationId?: string;
        },
    ): Promise<PushSendOutcome> {
        const notSent = (skipped: PushSkipReason): PushSendOutcome => ({
            sent: false,
            successCount: 0,
            failureCount: 0,
            skipped,
        });

        if (!this.firebase.isConfigured()) return notSent("not_configured");

        const toggle = await this.prisma.notificationToggle.findUnique({
            where: { userId },
        });
        if (toggle && !toggle.communication) return notSent("notifications_disabled");

        const devices = await this.prisma.deviceToken.findMany({
            where: { userId },
            select: { token: true },
        });

        if (devices.length === 0) return notSent("no_devices");

        const tokens = devices.map((d) => d.token);
        const data: Record<string, string> = {};
        if (input.type) data.type = input.type;
        if (input.entityId) data.entityId = input.entityId;
        if (input.notificationId) data.notificationId = input.notificationId;

        try {
            const result = await this.firebase.sendPushToTokens(tokens, {
                title: input.title,
                body: input.body,
                data: Object.keys(data).length > 0 ? data : undefined,
            });

            if (result.invalidTokens.length > 0) {
                await this.prisma.deviceToken.deleteMany({
                    where: { token: { in: result.invalidTokens } },
                });
            }

            this.logger.debug(
                `FCM to user ${userId}: ${result.successCount} sent, ${result.failureCount} failed`,
            );

            return {
                sent: result.successCount > 0,
                successCount: result.successCount,
                failureCount: result.failureCount,
            };
        } catch (err) {
            this.logger.warn(`FCM send failed for user ${userId}: ${String(err)}`);
            return { sent: false, successCount: 0, failureCount: tokens.length };
        }
    }

    /**
     * Wake an offline callee via FCM. Returns true when at least one token received the push.
     */
    async sendIncomingCallPush(
        userId: string,
        payload: Omit<IncomingCallPushPayload, "callPurpose"> & { callPurpose: CallPurpose },
    ): Promise<boolean> {
        if (!this.firebase.isConfigured()) return false;

        const toggle = await this.prisma.notificationToggle.findUnique({
            where: { userId },
        });
        if (toggle && !toggle.communication) return false;

        const devices = await this.prisma.deviceToken.findMany({
            where: { userId },
            select: { token: true },
        });
        if (devices.length === 0) return false;

        const tokens = devices.map((d) => d.token);

        try {
            const result = await this.firebase.sendIncomingCallPush(tokens, {
                ...payload,
                callPurpose: payload.callPurpose,
            });

            if (result.invalidTokens.length > 0) {
                await this.prisma.deviceToken.deleteMany({
                    where: { token: { in: result.invalidTokens } },
                });
            }

            this.logger.log(
                `Incoming call FCM to user ${userId}: ${result.successCount} sent, ${result.failureCount} failed`,
            );

            return result.successCount > 0;
        } catch (err) {
            this.logger.warn(`Incoming call FCM failed for user ${userId}: ${String(err)}`);
            return false;
        }
    }
}
