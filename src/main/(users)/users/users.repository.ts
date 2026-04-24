import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { HelperTx } from "@type/shared.types";
import { omit } from "@utils/index";
import { UserProfileRepository } from "../user-profile/user.profile.repository";
import { UpdateUserDto } from "./dto/update.user.dto";
import { CreateUserDto } from "./dto/users.dto";

@Injectable()
export class UserRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly profileRepo: UserProfileRepository,
    ) {}

    async store(input: CreateUserDto) {
        return await this.prisma.$transaction(async (tx: HelperTx) => {
            const isUser = await tx.user.findFirst({ where: { email: input.email } });
            // if user already has && user is already verified then throw error otherwise processed
            if (isUser && isUser.isVerified) {
                const existingUser = {
                    id: isUser.id,
                    email: isUser.email,
                    role: isUser.role ?? "USER", // default role if missing
                    isVerified: isUser.isVerified,
                    capLevel: isUser.capLevel ?? "BEGINNER",
                    createdAt: isUser.createdAt ?? new Date(),
                    updatedAt: isUser.updatedAt ?? new Date(),
                };

                return {
                    exists: true,
                    user: existingUser,
                };
            }

            if (isUser && !isUser.isVerified) {
                // if it's not verified then give chances to verify account again
                // to do that we have to sent the otp again
                return {
                    user: isUser,
                    hasAccount: true,
                };
            }

            const createUser = omit(input, ["name"]);
            // make sure role is USER, and cap level none when they create their account
            const user = await tx.user.create({
                data: {
                    ...createUser,
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
                            totalEarnings: 0.0,
                            currentMonthEarnings: 0.0,
                            volunteerHours: 0,
                            completedProjects: 0,
                            activityScore: 0.0,
                        },
                    },
                },
                include: {
                    profile: true,
                    metrics: true,
                },
            });

            // if input has name then create profile
            const profile = await this.profileRepo.create(
                user.id,
                {
                    name: input.name ?? input.email.split("@")[0],
                },
                tx,
            );
            //TODO: Create default notification settings

            const resObj = { ...user, profile };
            return {
                user: resObj,
                hasAccount: false,
            };
        });
    }

    async findByEmail(email: string) {
        return await this.prisma.user.findUnique({
            where: { email },
        });
    }
    async findById(
        id: string,
        select: Prisma.UserSelect<DefaultArgs> = {
            profile: true,
            id: true,
            email: true,
            role: true,
            authProvider: true,
            isVerified: true,
        },
    ) {
        return await this.prisma.user.findUnique({
            where: { id },
            select,
        });
    }
    async accountVerified(userId: string, isVerified: boolean) {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { isVerified },
        });
    }

    async update(id: string, data: UpdateUserDto) {
        console.log(data);
        const { profile, ...rest } = data;

        await this.prisma.user.update({
            where: { id },
            data: {
                ...rest,
                profile: profile
                    ? {
                          upsert: {
                              create: {
                                  ...profile,
                                  name: profile.name || "",
                                  username: profile.username!,
                              },
                              update: {
                                  ...profile,
                              },
                          },
                      }
                    : undefined,
            },
            include: { profile: true },
        });
    }

    async delete(userId: string) {
        return await this.prisma.user.delete({
            where: {
                id: userId,
            },
        });
    }

    async getUserById(id: string, includePrivateData = false) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                profile: true,
                about: true,
                metrics: includePrivateData,
                posts: {
                    take: 10,
                    orderBy: { createdAt: "desc" },
                    include: {
                        likes: { take: 5 },
                        comments: { take: 3 },
                        _count: {
                            select: { likes: true, comments: true, shares: true },
                        },
                    },
                },
                followers: includePrivateData
                    ? {
                          include: { follower: { include: { profile: true } } },
                      }
                    : false,
                following: includePrivateData
                    ? {
                          include: { following: { include: { profile: true } } },
                      }
                    : false,
                _count: {
                    select: {
                        posts: true,
                        followers: true,
                        following: true,
                        volunteerProjects: true,
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException("User not found");
        }
        return omit(user, ["password", "email"]);
    }

    async finds(where: Prisma.UserWhereInput = {}) {
        return await this.prisma.user.findMany({ where });
    }
}
