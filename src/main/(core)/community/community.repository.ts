import { CommunityRole, CommunityType } from "@constants/enums";
import { PrismaService } from "@lib/prisma/prisma.service";
import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";

@Injectable()
export class CommunityRepository {
    constructor(private readonly prisma: PrismaService) {}

    async toggleCommunityMembership(
        userId: string,
        communityId: string,
    ): Promise<{ joined: boolean }> {
        const existingMembership = await this.prisma.communitiesMembership.findUnique({
            where: {
                userId_communityId: { userId, communityId },
            },
        });

        return await this.prisma.$transaction(async (prisma) => {
            if (existingMembership) {
                // Leave community (only if not owner)
                if (existingMembership.role === "ADMIN") {
                    throw new BadRequestException("Community owner cannot leave");
                }

                await prisma.communitiesMembership.delete({
                    where: { id: existingMembership.id },
                });

                return { joined: false };
            } else {
                // Join community
                await prisma.communitiesMembership.create({
                    data: {
                        userId,
                        communityId,
                        role: "MEMBER",
                    },
                });

                return { joined: true };
            }
        });
    }

    /**
     * Update member role
     */
    async updateMemberRole(
        communityId: string,
        userId: string,
        newRole: CommunityRole,
        requesterId: string,
    ) {
        // Check if requester has permission
        const requesterMembership = await this.prisma.communitiesMembership.findUnique({
            where: {
                userId_communityId: { userId: requesterId, communityId },
            },
        });

        if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
            throw new ForbiddenException("Not authorized to change member roles");
        }

        return await this.prisma.communitiesMembership.update({
            where: {
                userId_communityId: { userId, communityId },
            },
            data: { role: newRole },
            include: {
                user: { include: { profile: true } },
                community: { include: { profile: true } },
            },
        });
    }

    /**
     * Get community members
     */
    async getCommunityMembers(communityId: string, role?: CommunityType) {
        return await this.prisma.communitiesMembership.findMany({
            where: {
                communityId,
                ...(role && { role: role as any }),
            },
            include: {
                user: {
                    include: {
                        profile: true,
                        _count: {
                            select: { posts: true, followers: true },
                        },
                    },
                },
            },
            orderBy: [
                { role: "asc" }, // Owners first, then admins, etc.
                { createdAt: "asc" },
            ],
        });
    }

    /**
     * Get community posts
     */
    async getCommunityPosts(communityId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        return await this.prisma.post.findMany({
            where: { communityId },
            include: {
                author: { include: { profile: true } },
                community: { include: { profile: true } },
                _count: {
                    select: { likes: true, comments: true, shares: true },
                },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        });
    }
}
