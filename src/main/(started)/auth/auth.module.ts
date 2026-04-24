import { AuthValidatorService } from "@global/auth-validator/auth-validator.service";
import { OptService } from "@lib/utils/otp.service";
import { UserProfileRepository } from "@module/(users)/user-profile/user.profile.repository";
import { UserRepository } from "@module/(users)/users/users.repository";
import { UserService } from "@module/(users)/users/users.service";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { JwtServices } from "@service/jwt.service";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import jwtConfig from "./config/jwt.config";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
    imports: [
        BullModule.registerQueue({ name: "users" }),
        JwtModule.registerAsync(jwtConfig.asProvider()),
        ConfigModule.forFeature(jwtConfig),
        // ...refresh and google i mean rest of the config
    ],
    controllers: [AuthController],
    providers: [
        AuthService,
        AuthRepository,
        JwtServices,
        JwtService,
        JwtStrategy,
        UserProfileRepository,
        OptService,
        UserRepository,
        UserService,
        AuthValidatorService,
    ],
    exports: [AuthRepository, AuthService, JwtModule, JwtStrategy, AuthValidatorService],
})
export class AuthModule {}
