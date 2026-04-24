// import { UserProfileRepository } from "@module/(users)/user-profile/user.profile.repository";
import { UserRepository } from "@module/(users)/users/users.repository";
import { Module } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtServices } from "@service/jwt.service";
import { AuthValidatorService } from "./auth-validator.service";

@Module({
    imports: [],
    providers: [
        JwtService,
        // UserProfileRepository,
        UserRepository,
        JwtServices,
        AuthValidatorService,
    ],
    exports: [AuthValidatorService],
})
export class AuthValidatorModule {}
