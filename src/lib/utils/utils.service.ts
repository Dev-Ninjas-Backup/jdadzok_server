import { ENVEnum } from "@common/enum/env.enum";
import { JWTPayload } from "@common/jwt/jwt.interface";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2"; // 🔴 name FIXED
import { plainToInstance } from "class-transformer";

@Injectable()
export class UtilsService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {}

    sanitizedResponse(sto: any, data: any) {
        return plainToInstance(sto, data, { excludeExtraneousValues: true });
    }

    removeDuplicateIds(ids: string[]) {
        return Array.from(new Set(ids));
    }
    async hash(value: string): Promise<string> {
        return argon2.hash(value, {
            type: argon2.argon2id,
        });
    }

    async compare(plainPassword: string, hashedPassword: string): Promise<boolean> {
        if (!hashedPassword.startsWith("$argon2")) {
            throw new Error("Stored password is not a valid argon2 hash");
        }

        return argon2.verify(hashedPassword, plainPassword);
    }

    generateToken(payload: JWTPayload): string {
        return this.jwtService.sign(payload, {
            secret: this.configService.getOrThrow(ENVEnum.JWT_SECRET),
            expiresIn: this.configService.getOrThrow(ENVEnum.JWT_EXPIRES_IN),
        });
    }
}
