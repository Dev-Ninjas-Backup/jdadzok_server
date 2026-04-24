import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { FriendRequestAction } from "./dto/friend-request.dto";

@Injectable()
export class FriendRequestService {
    constructor(private prisma: PrismaService) {}

    async sendRequest(senderId: string, receiverId: string) {
        if (senderId === receiverId) throw new Error("You cannot send request to yourself");
        const existingFriend = await this.prisma.friendRequest.findFirst({
            where: {
                status: "ACCEPTED",
                OR: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId },
                ],
            },
        });

        if (existingFriend) throw new Error("You are already friends with this user");

        const existingPending = await this.prisma.friendRequest.findFirst({
            where: {
                status: "PENDING",
                OR: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId },
                ],
            },
        });

        if (existingPending) throw new Error("Friend request is already pending with this user");

        return this.prisma.friendRequest.create({
            data: { senderId, receiverId },
        });
    }

    async cancelRequestByReceiver(senderId: string, receiverId: string) {
        const request = await this.prisma.friendRequest.findFirst({
            where: {
                senderId,
                receiverId,
                status: "PENDING",
            },
        });

        if (!request) throw new Error("Pending friend request not found");

        return this.prisma.friendRequest.delete({
            where: { id: request.id },
        });
    }

    async respondRequest(requestId: string, userId: string, action: FriendRequestAction) {
        const request = await this.prisma.friendRequest.findUnique({
            where: { id: requestId },
        });

        if (!request) throw new Error("Friend request not found");
        if (request.receiverId !== userId)
            throw new Error("You are not allowed to respond to this request");

        const status = action === FriendRequestAction.ACCEPT ? "ACCEPTED" : "REJECTED";

        return this.prisma.friendRequest.update({
            where: { id: requestId },
            data: { status },
        });
    }

    async getPendingRequests(userId: string) {
        return this.prisma.friendRequest.findMany({
            where: { receiverId: userId, status: "PENDING" },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                name: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async getNonFriends(userId: string) {
        const acceptedRequests = await this.prisma.friendRequest.findMany({
            where: {
                status: "ACCEPTED",
                OR: [{ senderId: userId }, { receiverId: userId }],
            },
            select: { senderId: true, receiverId: true },
        });

        const friendIds = acceptedRequests.map((f) =>
            f.senderId === userId ? f.receiverId : f.senderId,
        );

        const pendingRequests = await this.prisma.friendRequest.findMany({
            where: {
                status: "PENDING",
                OR: [{ senderId: userId }, { receiverId: userId }],
            },
            select: { senderId: true, receiverId: true },
        });

        const pendingIds = pendingRequests.map((f) =>
            f.senderId === userId ? f.receiverId : f.senderId,
        );

        const excludeIds = [...new Set([...friendIds, ...pendingIds, userId])];
        const users = await this.prisma.user.findMany({
            where: { id: { notIn: excludeIds } },
            select: {
                id: true,
                email: true,
                profile: {
                    select: { name: true, avatarUrl: true },
                },
            },
        });

        return users;
    }

    async getFriends(userId: string) {
        // 1. Get all accepted friend requests where user is sender or receiver
        const acceptedRequests = await this.prisma.friendRequest.findMany({
            where: {
                status: "ACCEPTED",
                OR: [{ senderId: userId }, { receiverId: userId }],
            },
            select: {
                senderId: true,
                receiverId: true,
            },
        });

        // 2. Get the friend IDs (other party in the request)
        const friendIds = acceptedRequests.map((f) =>
            f.senderId === userId ? f.receiverId : f.senderId,
        );

        // 3. Fetch user info + profile of friends
        const friends = await this.prisma.user.findMany({
            where: { id: { in: friendIds } },
            select: {
                id: true,
                email: true,
                profile: { select: { name: true, avatarUrl: true } },
            },
        });

        return friends;
    }
}
