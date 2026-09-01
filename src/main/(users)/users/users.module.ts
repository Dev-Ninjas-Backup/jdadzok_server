import { MailService } from "@lib/mail/mail.service";
import { PrismaService } from "@lib/prisma/prisma.service";
import { OptService } from "@lib/utils/otp.service";
import { AuthModule } from "@module/(started)/auth/auth.module";
import { SearchModule } from "@module/(search)/search.module";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtServices } from "@service/jwt.service";
import { UserProfileModule } from "../user-profile/user.profile.module";
import { FollowModule } from "../follow/follow.module";
import { UserProfileRepository } from "../user-profile/user.profile.repository";
import { UserController } from "./users.controller";
import { UsersProcessor } from "./users.processor";
import { UserRepository } from "./users.repository";
import { UserService } from "./users.service";

@Module({
    imports: [
        BullModule.registerQueue({ name: "users" }),
        UserProfileModule,
        FollowModule,
        AuthModule,
        SearchModule,
    ],
    controllers: [UserController],
    providers: [
        UsersProcessor,
        JwtService,
        UserRepository,
        UserService,
        JwtServices,
        PrismaService,
        UserProfileRepository,
        OptService,
        MailService,
    ],
    exports: [UserRepository, UserService],
})
export class UserModule {}
