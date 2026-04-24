import { Module } from "@nestjs/common";
import { UserRepository } from "../users/users.repository";
import { UserProfileController } from "./user.profile.controller";
import { UserProfileRepository } from "./user.profile.repository";
import { UserProfileService } from "./user.profile.service";

@Module({
    imports: [],
    controllers: [UserProfileController],
    providers: [UserProfileRepository, UserProfileService, UserRepository],
    exports: [UserProfileRepository, UserProfileService],
})
export class UserProfileModule {}
