import { PrismaService } from "@lib/prisma/prisma.service";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { HelperTx } from "@type/index";
import { CreateUserProfileDto } from "./dto/user.profile.dto";
import { CapArtPreferencesDto } from "./dto/cap-art-preferences.dto";

@Injectable()
export class UserProfileRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string, input: CreateUserProfileDto, tx: HelperTx) {
        const user = await tx.user.findFirst({
            where: { id: userId },
            include: { profile: true },
        });
        if (!user) throw new NotFoundException("User not found!");

        if (user.profile) {
            return await tx.profile.update({
                where: {
                    userId: user.id,
                    username: user.profile.username,
                },
                data: {
                    ...input,
                    followersCount: 0,
                    followingCount: 0,
                },
            });
        }
        return await tx.profile.create({
            data: {
                ...input,
                username: input.username ?? user.email.split("@")[0],
                name: input.name!,
                userId: user.id,
            },
        });
    }

    async update(userId: string, input: CreateUserProfileDto) {
        return await this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findFirst({
                where: { id: userId },
                include: { profile: true },
            });
            if (!user) throw new NotFoundException("User not found!");
            if (!user.profile) throw new NotFoundException("User profile not found!");

            const { profile } = user;
            return await tx.profile.update({
                where: { id: profile.id, userId: userId },
                data: {
                    ...input,
                    username: input.username ?? user.email.split("@")[0],
                    name: input.name ?? profile.name,
                },
            });
        });
    }

    async delete(userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const profile = await tx.profile.findFirst({ where: { userId } });
            if (!profile) throw new NotFoundException("User profile not found!");

            return await this.prisma.profile.delete({
                where: {
                    id: profile.id,
                    userId,
                },
            });
        });
    }

    async find(userId: string) {
        return await this.prisma.profile.findFirst({
            where: {
                userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        authProvider: true,
                        isVerified: true,
                        role: true,
                        capLevel: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
        });
    }

    async updateUserProfile(userId: string, data: CreateUserProfileDto) {
        // Check if username is taken by another user
        if (data.username) {
            const existingUser = await this.prisma.user.findFirst({
                where: {
                    AND: [{ profile: { username: data.username } }, { NOT: { id: userId } }],
                },
            });

            if (existingUser) {
                throw new BadRequestException("Username already taken");
            }
        }

        return await this.prisma.user.update({
            where: { id: userId },
            data: {
                profile: {
                    update: {
                        ...(data.name && { name: data.name }),
                        ...(data.username && { username: data.username }),
                        ...(data.title && { title: data.title }),
                        ...(data.bio && { bio: data.bio }),
                        ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
                        ...(data.coverUrl && { coverUrl: data.coverUrl }),
                        ...(data.location && { location: data.location }),
                        ...(typeof data.isToggleNotification === "boolean" && {
                            isToggleNotification: data.isToggleNotification,
                        }),
                        ...(typeof data.isVolunteerMentorOptIn === "boolean" && {
                            isVolunteerMentorOptIn: data.isVolunteerMentorOptIn,
                        }),
                        ...(data.capArtStyle && { capArtStyle: data.capArtStyle }),
                        ...(data.capArtPlacement && { capArtPlacement: data.capArtPlacement }),
                        ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
                        ...(data.gender && { gender: data.gender }),
                        ...(data.experience && { experience: data.experience }),
                    },
                },
            },
            include: { profile: true },
        });
    }

    async setVolunteerMentorOptIn(userId: string, isVolunteerMentorOptIn: boolean) {
        const profile = await this.prisma.profile.findFirst({ where: { userId } });
        if (!profile) {
            throw new NotFoundException("User profile not found!");
        }

        return await this.prisma.profile.update({
            where: { id: profile.id },
            data: { isVolunteerMentorOptIn },
            select: {
                id: true,
                userId: true,
                isVolunteerMentorOptIn: true,
                updatedAt: true,
            },
        });
    }

    async setCapArtPreferences(userId: string, dto: CapArtPreferencesDto) {
        if (dto.capArtStyle == null && dto.capArtPlacement == null) {
            throw new BadRequestException(
                "At least one of capArtStyle or capArtPlacement is required",
            );
        }

        const profile = await this.prisma.profile.findFirst({ where: { userId } });
        if (!profile) {
            throw new NotFoundException("User profile not found!");
        }

        return await this.prisma.profile.update({
            where: { id: profile.id },
            data: {
                ...(dto.capArtStyle != null && { capArtStyle: dto.capArtStyle }),
                ...(dto.capArtPlacement != null && { capArtPlacement: dto.capArtPlacement }),
            },
            select: {
                id: true,
                userId: true,
                capArtStyle: true,
                capArtPlacement: true,
                updatedAt: true,
                user: { select: { capLevel: true } },
            },
        });
    }

    async getCapArtPreferences(userId: string) {
        const profile = await this.prisma.profile.findFirst({
            where: { userId },
            select: {
                capArtStyle: true,
                capArtPlacement: true,
                user: { select: { capLevel: true } },
            },
        });
        if (!profile) {
            throw new NotFoundException("User profile not found!");
        }

        return {
            capLevel: profile.user.capLevel,
            capArtStyle: profile.capArtStyle,
            capArtPlacement: profile.capArtPlacement,
        };
    }

    async getUserProfile(userId: string, id: string) {
        const presentUser = await this.prisma.user.findFirst({ where: { id: userId } });
        if (!presentUser) {
            throw new BadRequestException("Forbiden Access");
        }
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                profile: true,
                about: true,
            },
        });
        if (!user) {
            throw new NotFoundException("User Is Not Found");
        }
        return user;
    }
}
