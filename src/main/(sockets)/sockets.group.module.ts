import { AuthValidatorService } from "@global/auth-validator/auth-validator.service";
import { UserProfileRepository } from "@module/(users)/user-profile/user.profile.repository";
import { UserRepository } from "@module/(users)/users/users.repository";
import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { JwtServices } from "@service/jwt.service";
import { RootGetway } from "./base/root.getway";
import { ChatModule } from "./chats/chats.module";
import { SocketAuthGuard } from "./guards/socket-auth.guard";
import { SocketMiddleware } from "./middleware/socket.middleware";
import { RedisService } from "./services/redis.service";

@Global()
@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true }), ChatModule],
    controllers: [],
    providers: [
        {
            provide: APP_GUARD,
            useClass: SocketAuthGuard,
        },
        RedisService,
        SocketMiddleware,

        JwtService,
        UserProfileRepository,
        UserRepository,
        JwtServices,
        AuthValidatorService,
        RootGetway,
    ],
    exports: [SocketMiddleware, RedisService],
})
export class SocketsGroupModule {}
