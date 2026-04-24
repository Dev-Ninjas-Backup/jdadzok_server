import { PrismaService } from "@lib/prisma/prisma.service";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CreateCommunityDto, UpdateCommunityDto } from "./dto/communities.dto";

@Injectable()
export class CommunitiesService {
    constructor(private readonly prisma: PrismaService) {}

    // create new community......
    async createCommunity(userId: string, dto: CreateCommunityDto) {
        const communitity = await this.prisma.community.findFirst({
            where: {
                ownerId: userId,
                profile: {
                    is: {
                        username: dto.profile?.username,
                    },
                },
            },
        });
        if (communitity) {
            throw new BadRequestException("Community Already Exist.");
        }

        return await this.prisma.community.create({
            data: {
                owner: {
                    connect: { id: userId },
                },
                communityType: dto.communityType,
                foundationDate: dto.foundationDate,
                about: {
                    create: {
                        ...dto.about,
                    },
                },
                profile: {
                    create: dto.profile,
                },
            },
            include: {
                about: true,
                profile: true,
            },
        });
    }
    // find All data....
    async findAll() {
        const community = await this.prisma.community.findMany({
            include: {
                profile: true,
                about: true,
            },
        });
        return community;
    }

    // find one community
    async findOne(communityId: string) {
        const community = await this.prisma.community.findUnique({
            where: { id: communityId },
            include: { profile: true, about: true, memberships: true },
        });
        if (!community) {
            throw new NotFoundException("Community Not Found");
        }
        return community;
    }
    // Delete community
    async deleteCommunity(userId: string, communityId: string) {
        const isExistCommunity = await this.prisma.community.findFirst({
            where: {
                id: communityId,
                ownerId: userId,
            },
        });
        if (!isExistCommunity) {
            throw new NotFoundException("Community is not found.");
        }

        return this.prisma.community.delete({
            where: { id: communityId },
        });
    }

    // update community
    async updateCommunity(userId: string, communityid: string, dto: UpdateCommunityDto) {
        const isExistCommunity = await this.prisma.community.findUnique({
            where: { id: communityid },
        });
        if (!isExistCommunity) {
            throw new NotFoundException("Community is Not Found.");
        }
        const user = await this.prisma.community.findFirst({
            where: { ownerId: userId },
        });
        if (!user) {
            throw new NotFoundException("Unauthorized Access.");
        }

        return this.prisma.community.update({
            where: { id: communityid },
            data: {
                communityType: dto.communityType,
                about: {
                    update: {
                        ...dto.about,
                    },
                },
                profile: {
                    update: {
                        ...dto.profile,
                    },
                },
            },
            include: {
                about: true,
                profile: true,
            },
        });
    }

    // user----community followers.

    async userFollowCommunity(userId: string, communityId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException(`User with id ${userId} not found`);
        const community = await this.prisma.community.findUnique({
            where: { id: communityId },
        });
        if (!community) throw new NotFoundException(`Community with id ${communityId} not found`);

        const exists = await this.prisma.communityFollower.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });
        if (exists) throw new BadRequestException("Already following");
        await this.prisma.$transaction([
            this.prisma.communityFollower.create({
                data: { userId, communityId },
            }),
            this.prisma.communityProfile.update({
                where: { communityId },
                data: { followersCount: { increment: 1 } },
            }),
        ]);

        return { message: "User followed community" };
    }

    async userUnfollowCommunity(userId: string, communityId: string) {
        const follow = await this.prisma.communityFollower.findUnique({
            where: { userId_communityId: { userId, communityId } },
        });
        if (!follow) throw new BadRequestException("Not following");

        await this.prisma.$transaction([
            this.prisma.communityFollower.delete({ where: { id: follow.id } }),

            this.prisma.communityProfile.update({
                where: { communityId },
                data: { followersCount: { decrement: 1 } },
            }),
        ]);

        return { message: "User unfollowed community" };
    }

    async likeCommunity(userId: string, communityId: string) {
        await this.prisma.community.update({
            where: { id: communityId },
            data: { likers: { connect: { id: userId } } },
        });

        const likes = await this.prisma.community.count({
            where: { id: communityId, likers: { some: {} } },
        });

        await this.prisma.community.update({
            where: { id: communityId },
            data: { likes },
        });

        return { success: true, likes };
    }

    async unlikeCommunity(userId: string, communityId: string) {
        await this.prisma.community.update({
            where: { id: communityId },
            data: { likers: { disconnect: { id: userId } } },
        });

        const likes = await this.prisma.community.count({
            where: { id: communityId, likers: { some: {} } },
        });

        await this.prisma.community.update({
            where: { id: communityId },
            data: { likes },
        });

        return { success: true, likes };
    }

    async getCommunityCounts(communityId: string) {
        const profile = await this.prisma.communityProfile.findUnique({
            where: { communityId },
            select: { followersCount: true },
        });

        const community = await this.prisma.community.findUnique({
            where: { id: communityId },
            select: { likes: true },
        });

        return {
            followersCount: profile?.followersCount ?? 0,
            likes: community?.likes ?? 0,
        };
    }
}
