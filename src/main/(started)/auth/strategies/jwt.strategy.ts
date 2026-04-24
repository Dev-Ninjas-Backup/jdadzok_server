import { ENVEnum } from "@common/enum/env.enum";
import { JWTPayload } from "@common/jwt/jwt.interface";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(config: ConfigService) {
        const jwtSecret = config.getOrThrow<string>(ENVEnum.JWT_SECRET);
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: jwtSecret,
            ignoreExpiration: false,
        });
    }

    validate(payload: JWTPayload) {
        // send user from the db
        return { userId: payload.sub, email: payload.email, roles: payload.roles };
    }
}
