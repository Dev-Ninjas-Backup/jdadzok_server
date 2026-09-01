import { MailService } from "@lib/mail/mail.service";
import { PrismaService } from "@lib/prisma/prisma.service";
import { OptService } from "@lib/utils/otp.service";
import { UtilsService } from "@lib/utils/utils.service";
import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { SearchSyncService } from "@module/(search)/search-sync.service";
import { AuthService } from "@module/(started)/auth/auth.service";
import { VerifyTokenDto } from "@module/(started)/auth/dto/verify-token.dto";
import { InjectQueue } from "@nestjs/bullmq";
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
    Optional,
} from "@nestjs/common";
import { JwtServices } from "@service/jwt.service";
import { TUser } from "@type/index";
import { omit } from "@utils/index";
import { Queue } from "bullmq";
import { CapLevel, Prisma, Role } from "@prisma/client";
import { FollowService } from "../follow/follow.service";
import { DeleteAccountDto } from "./dto/delete-account.dto";
import { ResentOtpDto } from "./dto/resent-otp.dto";
import { UpdateUserDto } from "./dto/update.user.dto";
import { CreateUserDto } from "./dto/users.dto";
import { UserRepository } from "./users.repository";
import { AllUserQueryDto } from "./dto/all-user-query.dto";

@Injectable()
export class UserService {
    constructor(
        @InjectQueue("users") private readonly userQueue: Queue,
        private readonly repository: UserRepository,
        private readonly prisma: PrismaService,
        private readonly utilsService: UtilsService,
        private readonly jwtService: JwtServices,
        private readonly otpService: OptService,
        private readonly mailService: MailService,
        private readonly followService: FollowService,
        private readonly authService: AuthService,
        @Optional() private readonly searchSync?: SearchSyncService,
    ) {}

    async register(body: CreateUserDto) {
        // email must need to be end with @gmail.com
        if (!body.email.endsWith("@gmail.com"))
            throw new BadRequestException("Email must end with @gmail.com");

        // has password if provider is email
        if (body.authProvider === "EMAIL") {
            if (!body.password)
                throw new ConflictException("Password is required for email registration");

            body.password = await this.utilsService.hash(body.password);
        }
        // if they select any other provider, we will not store password
        if (body.authProvider !== "EMAIL") delete body.password;
        // skip creating account now.
        const { user, hasAccount } = await this.repository.store(body);

        if (!user.isVerified) {
            // send otp again
            await this.userQueue.add(QUEUE_JOB_NAME.MAIL.SEND_OTP, {
                email: body.email,
                userId: user.id,
            });
            // return with mail verification
            return {
                user: omit(user, ["password"]),
                hasAccount,
            };
        }

        this.userQueue.add(QUEUE_JOB_NAME.MAIL.SEND_OTP, {
            email: body.email,
            userId: user.id,
        });

        const accessToken = await this.jwtService.signAsync({
            email: user.email,
            sub: user.id,
            roles: user.role,
        });

        return {
            accessToken,
            user: user,
            hasAccount,
        };
    }

    async verifyOpt(input: VerifyTokenDto) {
        const user = await this.repository.findById(input.userId, {
            id: true,
            email: true,
            isVerified: true,
            role: true,
        });
        if (!user) throw new NotFoundException("User not found with that ID");

        if (user.isVerified) throw new ConflictException("Account already verified!");

        await this.otpService.verifyOtp({
            userId: user.id,
            token: input.token,
            type: "EMAIL_VERIFICATION",
        });

        // Update DB
        const updatedUser = await this.repository.accountVerified(input.userId, !user.isVerified);

        if (!updatedUser) throw new InternalServerErrorException("Failt to update user");
        // when user account verified then we will have to send create a token and send it to as response
        const accessToken = await this.jwtService.signAsync({
            sub: user.id,
            roles: user.role,
            email: user.email,
        });
        return { user: omit(updatedUser, ["password"]), accessToken };
    }

    async resnetOtp(input: ResentOtpDto) {
        const user = await this.repository.findByEmail(input.email);
        if (!user) throw new NotFoundException("User not found with that email");

        /**
         * @deprecated
         * again send their otp
         */
        // const otp = await this.sendOtpMail({ userId: user.id, email: user.email });
        await this.userQueue.add(QUEUE_JOB_NAME.MAIL.SEND_OTP, {
            email: user.email,
            userId: user.id,
        });
        return { id: user.id, email: user.email };
    }

    async updateUser(userId: string, input: UpdateUserDto) {
        if (input.email) {
            throw new BadRequestException("Email Can't Change");
        }
        const user = await this.repository.findById(userId);
        if (!user) throw new NotFoundException("User not found!"); // not required for all the time
        if (user.id !== userId)
            throw new ConflictException("Request user OR input user not matched!", {
                description: "So, you cant update your account!",
            });
        // if update input has password then hash it
        if (input.password) input.password = await this.utilsService.hash(input.password);

        return await this.repository.update(userId, input);
    }

    async deleteAcount(userId: string) {
        const user = await this.repository.findById(userId);
        if (!user) throw new NotFoundException("User not found!");

        await this.cleanupBeforeDelete(userId);
        await this.repository.delete(userId);
    }

    async deleteMyAccount(userId: string, dto: DeleteAccountDto) {
        const user = await this.repository.findById(userId);
        if (!user) throw new NotFoundException("User not found!");

        if (user.twoFactorEnabled) {
            if (!dto.totpCode) {
                throw new BadRequestException("Authenticator code is required");
            }
            await this.authService.verifyTwoFactorCode(userId, dto.totpCode);
        } else if (user.authProvider === "EMAIL") {
            if (!dto.currentPassword) {
                throw new BadRequestException("Current password is required");
            }
            if (!user.password) {
                throw new BadRequestException("Password not set for this account");
            }
            const isValid = await this.utilsService.compare(dto.currentPassword, user.password);
            if (!isValid) {
                throw new ForbiddenException("Current password is incorrect");
            }
        }

        await this.cleanupBeforeDelete(userId);
        await this.repository.delete(userId);
        return { deleted: true };
    }

    private async cleanupBeforeDelete(userId: string) {
        await this.prisma.deviceToken.deleteMany({ where: { userId } });
        try {
            await this.searchSync?.deleteMember(userId);
        } catch {
            // Search vendor may be offline — account deletion must still proceed.
        }
    }

    async getMe(userId: string) {
        return await this.repository.findById(userId);
    }

    async sendOtpMail(user: Omit<TUser, "role">) {
        // make same innital email validation for send email
        if (!user.email.endsWith("@gmail.com"))
            throw new BadRequestException("Email must end with @gmail.com");
        const otp = await this.otpService.generateOtp({
            userId: user.userId,
            email: user.email,
            type: "EMAIL_VERIFICATION",
        });

        await this.mailService.sendMail(
            user.email,
            "Please verify your email with that otp",
            "otp",
            {
                otp: otp.token,
                expire: "2m",
            },
        );

        return otp;
    }

    async followUser(followerId: string, followedId: string) {
        return this.followService.followUser(followerId, followedId);
    }

    async unfollowUser(followerId: string, followedId: string) {
        return this.followService.unfollowUser(followerId, followedId);
    }

    async getUserById(id: string) {
        return await this.repository.getUserById(id);
    }

    async allUser(query: AllUserQueryDto) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const skip = (page - 1) * limit;

        const search = query.search?.trim();

        const orConditions: Prisma.UserWhereInput[] = [];

        if (search) {
            orConditions.push(
                {
                    email: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    profile: {
                        is: {
                            OR: [
                                {
                                    name: {
                                        contains: search,
                                        mode: "insensitive",
                                    },
                                },
                                {
                                    username: {
                                        contains: search,
                                        mode: "insensitive",
                                    },
                                },
                                {
                                    title: {
                                        contains: search,
                                        mode: "insensitive",
                                    },
                                },
                                {
                                    bio: {
                                        contains: search,
                                        mode: "insensitive",
                                    },
                                },
                                {
                                    location: {
                                        contains: search,
                                        mode: "insensitive",
                                    },
                                },
                            ],
                        },
                    },
                },
            );

            const upperSearch = search.toUpperCase();

            if (Object.values(Role).includes(upperSearch as Role)) {
                orConditions.push({
                    role: {
                        equals: upperSearch as Role,
                    },
                });
            }

            if (Object.values(CapLevel).includes(upperSearch as CapLevel)) {
                orConditions.push({
                    capLevel: {
                        equals: upperSearch as CapLevel,
                    },
                });
            }
        }

        const where: Prisma.UserWhereInput = search
            ? {
                  OR: orConditions,
              }
            : {};

        const [users, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    profile: true,
                },
            }),

            this.prisma.user.count({
                where,
            }),
        ]);

        return {
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
            data: users,
        };
    }
}
