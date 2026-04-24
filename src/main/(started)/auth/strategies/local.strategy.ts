// import { Injectable } from "@nestjs/common";
// import { PassportStrategy } from "@nestjs/passport";
// import { UserRepository } from "@module/users/users.repository";
// import { Strategy } from "passport-jwt";
// import { AuthService } from "../auth.service";

// @Injectable()
// export class LocalStrategy extends PassportStrategy(Strategy) {
//     constructor(private readonly authService: AuthService, private readonly userRepository: UserRepository) {
//         super({
//             usernameField: 'email',
//         })
//     }
//     validate(email: string, password: string) {
//         return this.userRepository.findByEmail(email);
//     }
// }
