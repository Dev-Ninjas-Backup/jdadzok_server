import { MailService } from "@lib/mail/mail.service";
import { PrismaService } from "@lib/prisma/prisma.service";
import { OptService } from "@lib/utils/otp.service";
import { UtilsService } from "@lib/utils/utils.service";
import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { VerifyTokenDto } from "@module/(started)/auth/dto/verify-token.dto";
import { InjectQueue } from "@nestjs/bullmq";
import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from "@nestjs/common";
import { JwtServices } from "@service/jwt.service";
import { TUser } from "@type/index";
import { omit } from "@utils/index";
import { Queue } from "bullmq";
import { ResentOtpDto } from "./dto/resent-otp.dto";
import { UpdateUserDto } from "./dto/update.user.dto";
import { CreateUserDto } from "./dto/users.dto";
import { UserRepository } from "./users.repository";

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

        await this.repository.delete(userId);
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
        if (followerId === followedId) {
            throw new ConflictException("Cannot follow userself");
        }

        const [follower, following] = await Promise.all([
            this.prisma.user.findUnique({ where: { id: followerId } }),
            this.prisma.user.findUnique({ where: { id: followedId } }),
        ]);

        // Check user exis with id
        if (!follower || !following) {
            throw new BadRequestException("Invalid user");
        }

        // Check already follow
        const userFollow = await this.prisma.userFollow.findUnique({
            where: {
                followerId_followedId: {
                    followerId,
                    followedId,
                },
            },
        });

        if (userFollow) {
            throw new ConflictException("You are already following...");
        }

        return await this.prisma.$transaction([
            this.prisma.userFollow.create({
                data: {
                    followerId,
                    followedId,
                },
                select: {
                    follower: true,
                    followed: true,
                    createdAt: true,
                },
            }),

            this.prisma.profile.update({
                where: { userId: followerId },
                data: {
                    followingCount: { increment: 1 },
                },
            }),

            this.prisma.profile.update({
                where: {
                    userId: followerId,
                },
                data: {
                    followersCount: { increment: 1 },
                },
            }),
        ]);
    }

    async unfollowUser(followerId: string, followedId: string) {
        const userFollow = await this.prisma.userFollow.findUnique({
            where: {
                followerId_followedId: {
                    followerId,
                    followedId,
                },
            },
        });
        if (!userFollow) {
            throw new NotFoundException("You must have to follow the user before unfollow");
        }

        if (!userFollow?.followedId || !userFollow.followerId)
            throw new NotFoundException("Follower or following not found!");

        return await this.prisma.$transaction([
            this.prisma.userFollow.delete({
                where: {
                    followerId_followedId: {
                        followerId,
                        followedId,
                    },
                },
            }),
            this.prisma.profile.update({
                where: {
                    userId: followerId,
                },
                data: {
                    followingCount: { decrement: 1 },
                },
            }),
            this.prisma.profile.update({
                where: {
                    userId: followedId,
                },
                data: {
                    followersCount: { decrement: 1 },
                },
            }),
            // update user profile metrics
            this.prisma.userMetrics.update({
                where: {
                    userId: followerId,
                },
                data: {
                    totalFollowing: {
                        decrement: 1,
                    },
                },
            }),
        ]);
    }

    async getUserById(id: string) {
        return await this.repository.getUserById(id);
    }

    async allUser() {
        const allUser = await this.prisma.user.findMany({});
        return allUser;
    }
}
