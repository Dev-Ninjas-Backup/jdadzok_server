import { FirebaseService } from "@lib/firebase/firebase.service";
import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable, Logger } from "@nestjs/common";
import { NotificationType } from "@prisma/client";

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
    ): Promise<void> {
        if (!this.firebase.isConfigured()) return;

        const toggle = await this.prisma.notificationToggle.findUnique({
            where: { userId },
        });
        if (toggle && !toggle.communication) return;

        const devices = await this.prisma.deviceToken.findMany({
            where: { userId },
            select: { token: true },
        });

        if (devices.length === 0) return;

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
        } catch (err) {
            this.logger.warn(`FCM send failed for user ${userId}: ${String(err)}`);
        }
    }
}
