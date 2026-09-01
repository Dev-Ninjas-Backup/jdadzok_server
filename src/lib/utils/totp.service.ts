import { Injectable } from "@nestjs/common";
import { authenticator } from "otplib";

const APP_NAME = "Synqulan";

@Injectable()
export class TotpService {
    generateSecret(): string {
        return authenticator.generateSecret();
    }

    keyUri(email: string, secret: string): string {
        return authenticator.keyuri(email, APP_NAME, secret);
    }

    verify(token: string, secret: string): boolean {
        return authenticator.verify({ token, secret });
    }
}
