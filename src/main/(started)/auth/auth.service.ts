import { MailContext } from "@lib/mail/mail-context.type";
import { MailService } from "@lib/mail/mail.service";
import { OptService } from "@lib/utils/otp.service";
import { UtilsService } from "@lib/utils/utils.service";
import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { ResentOtpDto } from "@module/(users)/users/dto/resent-otp.dto";
import { UserRepository } from "@module/(users)/users/users.repository";
import { InjectQueue } from "@nestjs/bullmq";
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import { JwtServices } from "@service/jwt.service";
import { TUser } from "@type/index";
import { Queue } from "bullmq";
import { ForgetPasswordDto } from "./dto/forget.dto";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyTokenDto } from "./dto/verify-token.dto";
import { ChangedPasswordDto } from "./dto/change.password.dto";
import { TwoFactorCodeDto, TwoFactorLoginDto } from "./dto/two-factor.dto";
import { PrismaService } from "@lib/prisma/prisma.service";
import { FirebaseService } from "@lib/firebase/firebase.service";
import { TotpService } from "@lib/utils/totp.service";
import { AuthProvider } from "@prisma/client";

@Injectable()
export class AuthService {
    constructor(
        @InjectQueue("users") private readonly userQueue: Queue,
        private readonly userRepository: UserRepository,
        private readonly utilsService: UtilsService,
        private readonly jwtService: JwtServices,
        private readonly mailService: MailService,
        private readonly otpService: OptService,
        private readonly prisma: PrismaService,
        private readonly firebase: FirebaseService,
        private readonly totp: TotpService,
    ) {}

    async login(input: LoginDto) {
        if (!input.email.endsWith("@gmail.com"))
            throw new BadRequestException("Email must end with @gmail.com");

        const user = await this.userRepository.findByEmail(input.email);
        if (!user) throw new NotFoundException("User not found, Please sign up first");
        if (!user.isVerified) throw new UnauthorizedException("Please verify your account first");

        if (user.authProvider === "EMAIL" && user.password) {
            const isMatch = await this.utilsService.compare(input.password!, user.password);
            if (!isMatch) throw new ForbiddenException("Email or Password Invalid!");
        }

        if (user.twoFactorEnabled && user.twoFactorSecret) {
            const mfaToken = await this.jwtService.signAsync(
                { sub: user.id, email: user.email, roles: user.role, purpose: "mfa" },
                { expiresIn: "5m" },
            );
            return {
                requiresMfa: true,
                mfaToken,
                user: this.toSafeUser(user),
            };
        }

        const accessToken = await this.jwtService.signAsync({
            sub: user.id,
            roles: user.role,
            email: user.email,
        });

        return {
            accessToken,
            user: this.toSafeUser(user),
        };
    }

    private toSafeUser(user: {
        id: string;
        email: string;
        role: string;
        isVerified: boolean;
        capLevel: string;
        createdAt: Date;
        updatedAt: Date;
        stripeAccountId: string | null;
        stripeCustomerId: string | null;
        twoFactorEnabled?: boolean;
    }) {
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified,
            capLevel: user.capLevel,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            stripeAccountId: user.stripeAccountId,
            stripeCustomerId: user.stripeCustomerId,
            twoFactorEnabled: user.twoFactorEnabled ?? false,
        };
    }

    async setupTwoFactor(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException("User not found");
        if (user.twoFactorEnabled) {
            throw new ConflictException("Two-factor authentication is already enabled");
        }

        const secret = this.totp.generateSecret();
        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorSecret: secret, twoFactorEnabled: false },
        });

        return {
            secret,
            otpauthUrl: this.totp.keyUri(user.email, secret),
        };
    }

    async enableTwoFactor(userId: string, dto: TwoFactorCodeDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException("User not found");
        if (user.twoFactorEnabled) {
            throw new ConflictException("Two-factor authentication is already enabled");
        }
        if (!user.twoFactorSecret) {
            throw new BadRequestException("Call POST /auth/2fa/setup first");
        }
        if (!this.totp.verify(dto.code, user.twoFactorSecret)) {
            throw new ForbiddenException("Invalid authenticator code");
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: true },
        });

        return { message: "Two-factor authentication enabled" };
    }

    async disableTwoFactor(userId: string, dto: TwoFactorCodeDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException("User not found");
        if (!user.twoFactorEnabled || !user.twoFactorSecret) {
            throw new BadRequestException("Two-factor authentication is not enabled");
        }
        if (!this.totp.verify(dto.code, user.twoFactorSecret)) {
            throw new ForbiddenException("Invalid authenticator code");
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: { twoFactorEnabled: false, twoFactorSecret: null },
        });

        return { message: "Two-factor authentication disabled" };
    }

    async verifyTwoFactorLogin(dto: TwoFactorLoginDto) {
        let payload: { sub: string; email: string; roles: string; purpose?: string };
        try {
            payload = await this.jwtService.verifyAsync(dto.mfaToken);
        } catch {
            throw new UnauthorizedException("MFA session expired — please sign in again");
        }
        if (payload.purpose !== "mfa") {
            throw new UnauthorizedException("Invalid MFA token");
        }

        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            throw new UnauthorizedException(
                "Two-factor authentication is not enabled for this account",
            );
        }
        if (!this.totp.verify(dto.code, user.twoFactorSecret)) {
            throw new ForbiddenException("Invalid authenticator code");
        }

        const accessToken = await this.jwtService.signAsync({
            sub: user.id,
            roles: user.role,
            email: user.email,
        });

        return {
            accessToken,
            user: this.toSafeUser(user),
        };
    }

    async verifyTwoFactorCode(userId: string, code: string): Promise<void> {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.twoFactorEnabled || !user.twoFactorSecret) return;
        if (!this.totp.verify(code, user.twoFactorSecret)) {
            throw new ForbiddenException("Invalid authenticator code");
        }
    }

    async loginWithFirebase(idToken: string, name?: string) {
        const firebaseUser = await this.firebase.verifyIdToken(idToken);
        return this.loginWithOAuth({
            email: firebaseUser.email,
            name: name ?? firebaseUser.name,
            provider: firebaseUser.provider,
            avatarUrl: firebaseUser.picture,
        });
    }

    async loginWithGoogle(idToken: string) {
        return this.loginWithFirebase(idToken);
    }

    async loginWithApple(idToken: string, name?: string) {
        return this.loginWithFirebase(idToken, name);
    }

    private async loginWithOAuth(input: {
        email: string;
        name?: string;
        provider: AuthProvider;
        avatarUrl?: string;
    }) {
        let user = await this.userRepository.findByEmail(input.email);

        if (!user) {
            user = await this.prisma.$transaction(async (tx) => {
                const created = await tx.user.create({
                    data: {
                        email: input.email,
                        authProvider: input.provider,
                        isVerified: true,
                        role: "USER",
                        capLevel: "NONE",
                        metrics: {
                            create: {
                                totalPosts: 0,
                                totalComments: 0,
                                totalLikes: 0,
                                totalShares: 0,
                                totalFollowers: 0,
                                totalFollowing: 0,
                                totalEarnings: 0,
                                currentMonthEarnings: 0,
                                volunteerHours: 0,
                                completedProjects: 0,
                                activityScore: 0,
                            },
                        },
                        profile: input.name
                            ? {
                                  create: {
                                      name: input.name,
                                      username: input.email.split("@")[0],
                                      avatarUrl: input.avatarUrl,
                                  },
                              }
                            : input.avatarUrl
                              ? {
                                    create: {
                                        name: input.email.split("@")[0],
                                        username: input.email.split("@")[0],
                                        avatarUrl: input.avatarUrl,
                                    },
                                }
                              : undefined,
                    },
                });

                return created;
            });
        } else if (user.authProvider !== input.provider && user.authProvider !== "EMAIL") {
            throw new ConflictException(`Account already registered with ${user.authProvider}`);
        } else if (!user.isVerified) {
            user = await this.prisma.user.update({
                where: { id: user.id },
                data: { isVerified: true, authProvider: input.provider },
            });
        }

        const accessToken = await this.jwtService.signAsync({
            sub: user.id,
            roles: user.role,
            email: user.email,
        });

        if (user.twoFactorEnabled && user.twoFactorSecret) {
            const mfaToken = await this.jwtService.signAsync(
                { sub: user.id, email: user.email, roles: user.role, purpose: "mfa" },
                { expiresIn: "5m" },
            );
            return {
                requiresMfa: true,
                mfaToken,
                user: this.toSafeUser(user),
            };
        }

        return {
            accessToken,
            user: this.toSafeUser(user),
        };
    }

    async forgetPassword(input: ForgetPasswordDto) {
        // email must need to be end with @gmail.com
        if (!input.email.endsWith("@gmail.com"))
            throw new BadRequestException("Email must end with @gmail.com");

        const user = await this.userRepository.findByEmail(input.email);
        if (!user) throw new NotFoundException("User not found");

        const otp = await this.sendOtpMail({ email: user.email, userId: user.id });
        return otp;
    }

    async verify(input: VerifyTokenDto) {
        await this.otpService.verifyOtp(
            {
                userId: input.userId,
                token: input.token,
                type: "RESET_PASSWORD",
            },
            false,
        );

        return {
            message: "OTP verified, continue to reset password",
        };
    }

    async resnetOtp(input: ResentOtpDto) {
        // email must need to be end with @gmail.com
        if (!input.email.endsWith("@gmail.com"))
            throw new BadRequestException("Email must end with @gmail.com");

        const user = await this.userRepository.findByEmail(input.email);
        if (!user) throw new NotFoundException("User not found with that email");

        if (user.isVerified) throw new ConflictException("Account already verified!");
        // again send their otp
        // const otp = await this.sendOtpMail({ userId: user.id, email: user.email });
        await this.userQueue.add(QUEUE_JOB_NAME.MAIL.SEND_OTP, {
            email: user.email,
            userId: user.id,
        });
        return {
            id: user.id,
            email: user.email,
        };
    }

    async resetPassword(input: ResetPasswordDto) {
        const user = await this.userRepository.findById(input.userId);
        if (!user) throw new NotFoundException("User not found with that ID");

        const otp = await this.otpService.getToken({
            type: "RESET_PASSWORD",
            userId: user.id,
        });
        if (!otp) throw new BadRequestException("OTP invalid or expire please verify OTP first");

        const hash = await this.utilsService.hash(input.password);

        // update the user password with that hash password
        const updatedUser = await this.userRepository.update(user.id, {
            password: hash,
        });
        await this.otpService.delete({ type: "RESET_PASSWORD", userId: user.id });
        return updatedUser;
    }

    async changedPassword(userId: string, dto: ChangedPasswordDto) {
        const { currentPassword, newPassword } = dto;

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }

        if (!user.password) {
            throw new BadRequestException("Password not set for this account");
        }

        const isValid = await this.utilsService.compare(currentPassword, user.password);

        if (!isValid) {
            throw new BadRequestException("Current password is incorrect");
        }

        const isSame = await this.utilsService.compare(newPassword, user.password);

        if (isSame) {
            throw new BadRequestException("New password cannot be same as current password");
        }

        const hash = await this.utilsService.hash(newPassword);

        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hash },
        });

        return {
            message: "Password changed successfully",
        };
    }

    async logout(email: string) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) throw new NotFoundException("User not found");
        return user;
    }

    private async sendOtpMail(user: Omit<TUser, "role">, context: MailContext = {}) {
        const otp = await this.otpService.generateOtp({
            userId: user.userId,
            email: user.email,
            type: "RESET_PASSWORD",
        });

        await this.mailService.sendMail(
            user.email,
            "Please verify token to reset password",
            "otp",
            { otp: otp.token, ...context },
        );
        return otp;
    }
}
