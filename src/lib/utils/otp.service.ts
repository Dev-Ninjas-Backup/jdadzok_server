import { TTL } from "@constants/ttl.constants";
import { RedisService } from "@module/(sockets)/services/redis.service";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { uniqueID } from "dev-unique-id";
import { OtpOptions, OtpPayload, OtpRedisData, OtpType, OtpVerifyPayload } from "./otp.types";

@Injectable()
export class OptService {
    constructor(private readonly redisService: RedisService) {}

    private getRedisKeyByType(type: OtpType, suffix: string) {
        switch (type) {
            case "RESET_PASSWORD":
                return suffix ? `RESET_PASSWORD_TOKEN:${suffix}` : "RESET_PASSWORD_TOKEN";
            case "EMAIL_VERIFICATION":
                return suffix ? `EMAIL_VERIFICATION_TOKEN:${suffix}` : "EMAIL_VERIFICATION_TOKEN";
            default:
                throw new Error(`Unsupported OTP type: ${type}`);
        }
    }

    async generateOtp(
        payload: OtpPayload,
        options: OtpOptions = { ttl: "2m", length: 6 },
    ): Promise<OtpRedisData> {
        const { userId, email, type } = payload;
        const { ttl = "2m", length } = options; // TODO: need to be change the ttl

        const redisKey = this.getRedisKeyByType(type, userId);

        const existing = await this.redisService.get(redisKey);

        if (existing) throw new ForbiddenException("You can request a new OTP after some time.");

        const token = uniqueID({ length, alphabet: true });
        const expireAt = new Date(
            Date.now() + (typeof ttl === "string" ? TTL[ttl] : ttl),
        ).toISOString();

        const data: OtpRedisData = {
            token: token.toString(),
            attempt: 0,
            expireAt,
            userId,
            email,
        };

        await this.redisService.set(redisKey, data, ttl);
        return data;
    }

    async verifyOtp(input: OtpVerifyPayload, isDelete = true): Promise<boolean> {
        const { userId, token, type } = input;

        const redisKey = this.getRedisKeyByType(type, userId);

        const data = await this.redisService.get<OtpRedisData>(redisKey);

        if (!data) {
            throw new ForbiddenException("OTP expired or not found");
        }

        if (data.attempt >= 2) {
            // Do not delete the OTP — just block the attempt
            throw new ForbiddenException("Too many failed attempts, please try again later");
        }

        if (data.token !== token) {
            // Increment attempts
            await this.redisService.set(
                redisKey,
                {
                    ...data,
                    attempt: data.attempt + 1,
                },
                "2m", // TODO: need to be add minimum 10m
            ); // Keep the remaining TTL

            throw new ForbiddenException("Wrong OTP");
        }
        if (isDelete) await this.redisService.del(redisKey);
        return true;
    }

    async getToken(payload: Omit<OtpVerifyPayload, "token">) {
        const redisKey = this.getRedisKeyByType(payload.type, payload.userId);
        const data = await this.redisService.get<OtpRedisData>(redisKey);
        return data;
    }

    async delete(payload: Omit<OtpVerifyPayload, "token">) {
        const redisKey = this.getRedisKeyByType(payload.type, payload.userId);
        await this.redisService.del(redisKey);
    }
}
