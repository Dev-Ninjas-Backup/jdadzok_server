import { CapLevel } from "@constants/enums";
import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { CapRequirements, User, UserMetrics } from "@prisma/client";

@Injectable()
export class CapLevelRepository {
    constructor(private readonly prisma: PrismaService) {}

    async getCapRequirements(capLevel: CapLevel): Promise<CapRequirements | null> {
        return await this.prisma.capRequirements.findUnique({
            where: { capLevel },
        });
    }

    async getAllCapRequirements(): Promise<CapRequirements[]> {
        return await this.prisma.capRequirements.findMany({
            orderBy: [{ capLevel: "asc" }],
        });
    }

    async getUserWithMetrics(userId: string) {
        return await this.prisma.user.findUnique({
            where: { id: userId },
            include: { metrics: true },
        });
    }

    async updateUserCapLevel(userId: string, newCapLevel: CapLevel): Promise<User> {
        return await this.prisma.user.update({
            where: { id: userId },
            data: { capLevel: newCapLevel },
        });
    }

    async getUsersEligibleForPromotion(
        capLevel: CapLevel,
    ): Promise<(User & { metrics: UserMetrics | null })[]> {
        const capRequirement = await this.getCapRequirements(capLevel);
        if (!capRequirement) return [];

        const whereConditions: any = {
            capLevel: {
                in: this.getPreviousCapLevels(capLevel),
            },
            metrics: {
                isNot: null,
            },
        };

        // Add activity score filter if required
        if (capRequirement.minActivityScore) {
            whereConditions.metrics.activityScore = {
                gte: capRequirement.minActivityScore,
            };
        }

        // Add volunteer hours filter if required
        if (capRequirement.minVolunteerHours) {
            whereConditions.metrics.volunteerHours = {
                gte: capRequirement.minVolunteerHours,
            };
        }

        return await this.prisma.user.findMany({
            where: whereConditions,
            include: { metrics: true },
        });
    }

    async createUserMetricsIfNotExists(userId: string): Promise<UserMetrics> {
        return await this.prisma.userMetrics.upsert({
            where: { userId },
            update: { userId },
            create: { userId },
        });
    }

    private getPreviousCapLevels(targetCapLevel: CapLevel): CapLevel[] {
        const capLevels: CapLevel[] = [
            "NONE",
            "GREEN",
            "YELLOW",
            "RED",
            "BLACK",
            "OSTRICH_FEATHER",
        ];
        const targetIndex = capLevels.indexOf(targetCapLevel);
        return capLevels.slice(0, targetIndex);
    }

    async getCapLevelStats(): Promise<any> {
        const stats = await this.prisma.user.groupBy({
            by: ["capLevel"],
            _count: {
                capLevel: true,
            },
        });

        return stats.reduce(
            (acc, stat) => {
                acc[stat.capLevel] = stat._count.capLevel;
                return acc;
            },
            {} as Record<CapLevel, number>,
        );
    }
}
