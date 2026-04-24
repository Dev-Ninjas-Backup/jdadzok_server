import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { startOfMonth, startOfWeek, subWeeks } from "date-fns";

@Injectable()
export class UserManagementService {
    constructor(private prisma: PrismaService) {}

    async getUserOverview() {
        const totalUsers = await this.prisma.user.count();

        const totalUsersLastMonth = await this.prisma.user.count({
            where: {
                createdAt: {
                    lt: startOfMonth(new Date()),
                },
            },
        });

        // Normalized Growth %
        const totalUsersGrowth =
            totalUsers + totalUsersLastMonth === 0
                ? 0
                : ((totalUsers - totalUsersLastMonth) / (totalUsers + totalUsersLastMonth)) * 100;

        // Active User %
        const activeUsers = await this.prisma.user.count({
            where: { bans: { none: {} } },
        });

        const activeUserPercent = totalUsers === 0 ? 0 : (activeUsers / totalUsers) * 100;

        // Weekly Stats
        const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const lastWeekStart = subWeeks(thisWeekStart, 1);

        const newThisWeek = await this.prisma.user.count({
            where: { createdAt: { gte: thisWeekStart } },
        });

        const newLastWeek = await this.prisma.user.count({
            where: {
                createdAt: {
                    gte: lastWeekStart,
                    lt: thisWeekStart,
                },
            },
        });

        // Normalized weekly growth %
        const newWeekPercent =
            newThisWeek + newLastWeek === 0
                ? 0
                : ((newThisWeek - newLastWeek) / (newThisWeek + newLastWeek)) * 100;

        const suspendedUsers = await this.prisma.user.count({
            where: { bans: { some: {} } },
        });

        return {
            totalUsers,
            totalUsersGrowth: Number(totalUsersGrowth.toFixed(2)),
            activeUsers,
            activeUserPercent: Number(activeUserPercent.toFixed(2)),
            newThisWeek,
            newWeekPercent: Number(newWeekPercent.toFixed(2)),
            suspendedUsers,
        };
    }
    async getUsers({
        search,
        status,
        role,
        page,
        limit,
    }: {
        search?: string;
        status?: "active" | "suspended";
        role?: string;
        page: number;
        limit: number;
    }) {
        const where: any = {};

        if (search) {
            where.OR = [
                { email: { contains: search, mode: "insensitive" } },
                { profile: { name: { contains: search, mode: "insensitive" } } },
            ];
        }

        if (status === "active") where.bans = { none: {} };
        if (status === "suspended") where.bans = { some: { isActive: true } };
        if (role) where.role = role;

        const users = await this.prisma.user.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: {
                profile: true,
                bans: true,
                metrics: true,
            },
            orderBy: { createdAt: "desc" },
        });

        const total = await this.prisma.user.count({ where });

        return {
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            data: users.map((u) => ({
                id: u.id,
                name: u.profile?.name || "",
                email: u.email,
                role: u.role,
                status: u.bans?.length > 0 ? "suspended" : "active",
                level: u.capLevel,
                points: u.metrics?.activityScore || 0,
                joinedAt: u.createdAt,
            })),
        };
    }

    async suspendUser(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException("User not found");

        await this.prisma.ban.create({
            data: {
                userId: id,
                reason: "Suspended by admin",
            },
        });

        return { message: "User suspended successfully" };
    }

    async activateUser(id: string) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) throw new NotFoundException("User not found");

        await this.prisma.ban.deleteMany({
            where: { userId: id },
        });

        return { message: "User activated successfully" };
    }
}
