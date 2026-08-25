import { Module } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { UserRepository } from "../users/users.repository";
import { UserProfileController } from "./user.profile.controller";
import { UserProfileRepository } from "./user.profile.repository";
import { UserProfileService } from "./user.profile.service";
import { ReputationPassportService } from "./reputation-passport.service";
import { SearchModule } from "@module/(search)/search.module";

@Module({
    imports: [SearchModule],
    controllers: [UserProfileController],
    providers: [
        UserProfileRepository,
        UserProfileService,
        ReputationPassportService,
        UserRepository,
        PrismaService,
    ],
    exports: [UserProfileRepository, UserProfileService, ReputationPassportService],
})
export class UserProfileModule {}
