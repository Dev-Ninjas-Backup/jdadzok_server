import {
    BadRequestException,
    Injectable,
    Logger,
    OnModuleInit,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthProvider } from "@prisma/client";
import * as admin from "firebase-admin";
import { DecodedIdToken } from "firebase-admin/auth";
import { BatchResponse, MulticastMessage } from "firebase-admin/messaging";

export interface VerifiedFirebaseUser {
    uid: string;
    email: string;
    name?: string;
    provider: AuthProvider;
    picture?: string;
}

export interface FcmNotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
}

export interface FcmSendResult {
    successCount: number;
    failureCount: number;
    invalidTokens: string[];
}

export interface IncomingCallPushPayload {
    callId: string;
    callerId: string;
    callerName: string;
    callerAvatarUrl?: string | null;
    mediaType: "audio" | "video";
    callPurpose: string;
}

@Injectable()
export class FirebaseService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseService.name);
    private app: admin.app.App | null = null;

    constructor(private readonly config: ConfigService) {}

    onModuleInit() {
        if (admin.apps.length > 0) {
            this.app = admin.app();
            return;
        }

        const serviceAccountJson = this.config.get<string>("FIREBASE_SERVICE_ACCOUNT_JSON");
        const projectId = this.config.get<string>("FIREBASE_PROJECT_ID");
        const clientEmail = this.config.get<string>("FIREBASE_CLIENT_EMAIL");
        const privateKey = this.config.get<string>("FIREBASE_PRIVATE_KEY")?.replace(/\\n/g, "\n");

        try {
            if (serviceAccountJson) {
                const parsed = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
                this.app = admin.initializeApp({
                    credential: admin.credential.cert(parsed),
                });
            } else if (projectId && clientEmail && privateKey) {
                this.app = admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId,
                        clientEmail,
                        privateKey,
                    }),
                });
            } else {
                this.logger.warn(
                    "Firebase Admin not configured — social auth and FCM push will be unavailable",
                );
            }
        } catch (err) {
            this.logger.error(`Failed to initialize Firebase Admin: ${String(err)}`);
        }
    }

    private getAuth() {
        if (!this.app) {
            throw new BadRequestException(
                "Firebase is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.",
            );
        }
        return admin.auth(this.app);
    }

    private getMessaging() {
        if (!this.app) {
            throw new BadRequestException(
                "Firebase is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.",
            );
        }
        return admin.messaging(this.app);
    }

    isConfigured(): boolean {
        return this.app !== null;
    }

    async sendPushToTokens(
        tokens: string[],
        payload: FcmNotificationPayload,
    ): Promise<FcmSendResult> {
        if (!this.app || tokens.length === 0) {
            return { successCount: 0, failureCount: 0, invalidTokens: [] };
        }

        const message: MulticastMessage = {
            tokens,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: payload.data,
            android: { priority: "high" },
            apns: { payload: { aps: { sound: "default" } } },
        };

        const response: BatchResponse = await this.getMessaging().sendEachForMulticast(message);
        const invalidTokens: string[] = [];

        response.responses.forEach((item, index) => {
            if (item.success) return;
            const code = item.error?.code;
            if (
                code === "messaging/registration-token-not-registered" ||
                code === "messaging/invalid-registration-token"
            ) {
                invalidTokens.push(tokens[index]);
            }
        });

        if (invalidTokens.length > 0) {
            this.logger.warn(`Removing ${invalidTokens.length} invalid FCM token(s)`);
        }

        return {
            successCount: response.successCount,
            failureCount: response.failureCount,
            invalidTokens,
        };
    }

    async sendIncomingCallPush(
        tokens: string[],
        payload: IncomingCallPushPayload,
    ): Promise<FcmSendResult> {
        if (!this.app || tokens.length === 0) {
            return { successCount: 0, failureCount: 0, invalidTokens: [] };
        }

        const mediaLabel = payload.mediaType === "video" ? "video" : "audio";
        const title = `Incoming ${mediaLabel} call`;
        const body = `${payload.callerName} is calling`;

        const data: Record<string, string> = {
            type: "call",
            callId: payload.callId,
            callerId: payload.callerId,
            callerName: payload.callerName,
            mediaType: payload.mediaType,
            callPurpose: payload.callPurpose,
        };
        if (payload.callerAvatarUrl) {
            data.callerAvatarUrl = payload.callerAvatarUrl;
        }

        const message: MulticastMessage = {
            tokens,
            notification: { title, body },
            data,
            android: {
                priority: "high",
                ttl: 30_000,
            },
            apns: {
                headers: { "apns-priority": "10" },
                payload: {
                    aps: {
                        alert: { title, body },
                        sound: "default",
                        "content-available": 1,
                    },
                },
            },
        };

        const response: BatchResponse = await this.getMessaging().sendEachForMulticast(message);
        const invalidTokens: string[] = [];

        response.responses.forEach((item, index) => {
            if (item.success) return;
            const code = item.error?.code;
            if (
                code === "messaging/registration-token-not-registered" ||
                code === "messaging/invalid-registration-token"
            ) {
                invalidTokens.push(tokens[index]);
            }
        });

        return {
            successCount: response.successCount,
            failureCount: response.failureCount,
            invalidTokens,
        };
    }

    async verifyIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
        let decoded: DecodedIdToken;
        try {
            decoded = await this.getAuth().verifyIdToken(idToken, true);
        } catch {
            throw new UnauthorizedException("Invalid or expired Firebase ID token");
        }

        const email = decoded.email;
        if (!email) {
            throw new UnauthorizedException(
                "Firebase account has no email. Enable email on the Firebase Auth provider.",
            );
        }

        return {
            uid: decoded.uid,
            email,
            name: decoded.name ?? undefined,
            picture: decoded.picture ?? undefined,
            provider: this.mapProvider(decoded.firebase?.sign_in_provider),
        };
    }

    private mapProvider(signInProvider?: string): AuthProvider {
        switch (signInProvider) {
            case "google.com":
                return "GOOGLE";
            case "apple.com":
                return "APPLE";
            case "facebook.com":
                return "FACEBOOK";
            default:
                return "EMAIL";
        }
    }
}
