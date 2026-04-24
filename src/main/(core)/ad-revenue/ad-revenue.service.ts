import { CapLevel } from "@constants/enums";
import { PrismaService } from "@lib/prisma/prisma.service";
import { UserMetricsService } from "@module/(users)/profile-metrics/user-metrics.service";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { User, UserMetrics } from "@prisma/client";
import { CapLevelRepository } from "../cap-level/cap-lavel.repository";
import {
    CreateRevenueShareDto,
    MonthlyRevenueCalculationDto,
    PlatformRevenueStatsDto,
    RevenueCalculationResultDto,
    RevenueHistoryQueryDto,
    RevenueShareResponseDto,
    UserRevenueSummaryDto,
} from "../cap-level/dto/cap-leve.dto";

/**
 * Interface for revenue calculation result
 */
interface RevenueDistributionResult {
    userId: string;
    capLevel: CapLevel;
    sharePercentage: number;
    eligibleAmount: number;
    activityScore: number;
}

/**
 * Service for managing ad revenue sharing and calculations
 * Handles monthly revenue distribution based on cap levels and user engagement
 */
@Injectable()
export class AdRevenueService {
    private readonly logger = new Logger(AdRevenueService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly userMetricsService: UserMetricsService,
        private readonly capLevelRepository: CapLevelRepository,
    ) {}

    /**
     * Creates a new revenue share record for a user
     * @param createDto Revenue share creation data
     * @returns Created revenue share record
     */
    async createRevenueShare(createDto: CreateRevenueShareDto): Promise<RevenueShareResponseDto> {
        try {
            // Validate that user exists
            const user = await this.prisma.user.findUnique({
                where: { id: createDto.userId },
            });

            if (!user) {
                throw new BadRequestException("User not found");
            }

            // Check if revenue share already exists for this user/month/year
            const existingShare = await this.prisma.adRevenueShare.findUnique({
                where: {
                    userId_month_year: {
                        userId: createDto.userId,
                        month: createDto.month,
                        year: createDto.year,
                    },
                },
            });

            if (existingShare) {
                throw new BadRequestException(
                    `Revenue share already exists for user ${createDto.userId} for ${createDto.month}/${createDto.year}`,
                );
            }

            // Create the revenue share record
            const revenueShare = await this.prisma.adRevenueShare.create({
                data: createDto,
            });

            // Update user metrics with earnings
            await this.userMetricsService.addEarnings(createDto.userId, createDto.amount);

            this.logger.log(
                `Created revenue share of $${createDto.amount} for user ${createDto.userId} (${createDto.month}/${createDto.year})`,
            );

            return revenueShare;
        } catch (error) {
            this.logger.error(`Failed to create revenue share: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Calculates monthly revenue distribution for all eligible users
     * @param calculationDto Monthly revenue calculation parameters
     * @returns Revenue calculation results
     */
    async calculateMonthlyRevenue(
        calculationDto: MonthlyRevenueCalculationDto,
    ): Promise<RevenueCalculationResultDto> {
        const { month, year, totalPlatformRevenue, dryRun = false } = calculationDto;

        try {
            this.logger.log(
                `Starting revenue calculation for ${month}/${year} - Total Revenue: $${totalPlatformRevenue} (Dry Run: ${dryRun})`,
            );

            // Check if calculation already exists for this month/year (unless dry run)
            if (!dryRun) {
                const existingCalculation = await this.prisma.adRevenueShare.findFirst({
                    where: { month, year },
                });

                if (existingCalculation) {
                    throw new BadRequestException(
                        `Revenue calculation already exists for ${month}/${year}. Use dry run to preview calculations.`,
                    );
                }
            }

            // Get all active users with metrics
            const eligibleUsers = await this.getEligibleUsersForRevenue();

            if (eligibleUsers.length === 0) {
                this.logger.warn("No eligible users found for revenue distribution");
                return this.createEmptyCalculationResult(month, year, dryRun);
            }

            // Calculate revenue distribution
            const distributions = await this.calculateRevenueDistributions(
                eligibleUsers,
                totalPlatformRevenue,
            );

            const distributionByLevel = this.groupDistributionsByLevel(distributions);
            const totalDistributed = distributions.reduce(
                (sum, dist) => sum + dist.eligibleAmount,
                0,
            );

            // Save results if not dry run
            if (!dryRun) {
                await this.saveRevenueDistributions(distributions, month, year);
            }

            const result: RevenueCalculationResultDto = {
                totalUsers: distributions.length,
                totalDistributed,
                distributionByLevel,
                month,
                year,
                isDryRun: dryRun,
                calculatedAt: new Date(),
            };

            this.logger.log(
                `Revenue calculation completed - Distributed $${totalDistributed} to ${distributions.length} users`,
            );

            return result;
        } catch (error) {
            this.logger.error(`Failed to calculate monthly revenue: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Gets revenue history for a specific user
     * @param userId User ID
     * @param queryDto Query parameters for filtering
     * @returns Paginated revenue history
     */
    async getUserRevenueHistory(
        userId: string,
        queryDto: RevenueHistoryQueryDto,
    ): Promise<{
        data: RevenueShareResponseDto[];
        total: number;
        page: number;
        limit: number;
    }> {
        const { year, month, capLevel, page = 1, limit = 20 } = queryDto;
        const offset = (page - 1) * limit;

        const whereClause: any = { userId };

        if (year) whereClause.year = year;
        if (month) whereClause.month = month;
        if (capLevel) whereClause.capLevelAtTime = capLevel;

        try {
            const [data, total] = await Promise.all([
                this.prisma.adRevenueShare.findMany({
                    where: whereClause,
                    orderBy: [{ year: "desc" }, { month: "desc" }],
                    skip: offset,
                    take: limit,
                }),
                this.prisma.adRevenueShare.count({ where: whereClause }),
            ]);

            return { data, total, page, limit };
        } catch (error) {
            this.logger.error(`Failed to get revenue history for user ${userId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Gets comprehensive revenue summary for a user
     * @param userId User ID
     * @returns User revenue summary with analytics
     */
    async getUserRevenueSummary(userId: string): Promise<UserRevenueSummaryDto> {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: { metrics: true },
            });

            if (!user) {
                throw new BadRequestException("User not found");
            }

            // Get all revenue shares for this user
            const revenueShares = await this.prisma.adRevenueShare.findMany({
                where: { userId },
                orderBy: [{ year: "desc" }, { month: "desc" }],
            });

            // Calculate summary statistics
            const totalEarnings = revenueShares.reduce((sum, share) => sum + share.amount, 0);
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const currentMonthEarnings = revenueShares
                .filter((share) => share.month === currentMonth && share.year === currentYear)
                .reduce((sum, share) => sum + share.amount, 0);

            // Last 12 months earnings
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

            const last12MonthsEarnings = revenueShares
                .filter((share) => {
                    const shareDate = new Date(share.year, share.month - 1);
                    return shareDate >= twelveMonthsAgo;
                })
                .reduce((sum, share) => sum + share.amount, 0);

            // Find best earning month
            const bestMonth = revenueShares.reduce(
                (best, share) => (share.amount > best.amount ? share : best),
                revenueShares[0] || {
                    month: currentMonth,
                    year: currentYear,
                    amount: 0,
                    capLevelAtTime: user.capLevel,
                },
            );

            // Calculate average monthly earnings
            const activeMonths = new Set(
                revenueShares.map((share) => `${share.year}-${share.month}`),
            ).size;
            const averageMonthlyEarnings = activeMonths > 0 ? totalEarnings / activeMonths : 0;

            // Get revenue rank
            const revenueRank = await this.getUserRevenueRank(userId);

            // Get recent history (last 6 months)
            const recentHistory = revenueShares.slice(0, 6);

            return {
                userId,
                currentCapLevel: user.capLevel,
                totalEarnings,
                currentMonthEarnings,
                last12MonthsEarnings,
                averageMonthlyEarnings,
                bestMonth: {
                    month: bestMonth.month,
                    year: bestMonth.year,
                    amount: bestMonth.amount,
                    capLevel: bestMonth.capLevelAtTime,
                },
                activeMonths,
                revenueRank,
                recentHistory,
            };
        } catch (error) {
            this.logger.error(`Failed to get revenue summary for user ${userId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Gets platform-wide revenue statistics
     * @returns Comprehensive platform revenue analytics
     */
    async getPlatformRevenueStats(): Promise<PlatformRevenueStatsDto> {
        try {
            // Get all revenue shares
            const allShares = await this.prisma.adRevenueShare.findMany({
                orderBy: [{ year: "desc" }, { month: "desc" }],
            });

            const totalRevenue = allShares.reduce((sum, share) => sum + share.amount, 0);
            const totalDistributed = totalRevenue; // All shares are distributions

            // Current month data
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();

            const currentMonthShares = allShares.filter(
                (share) => share.month === currentMonth && share.year === currentYear,
            );

            const currentMonthRevenue = currentMonthShares.reduce(
                (sum, share) => sum + share.amount,
                0,
            );
            const currentMonthDistributed = currentMonthRevenue;

            // Get unique users with revenue
            const uniqueUsers = new Set(allShares.map((share) => share.userId));
            const averageRevenuePerUser =
                uniqueUsers.size > 0 ? totalRevenue / uniqueUsers.size : 0;

            // Platform retention (placeholder - would need total ad revenue vs distributed)
            const platformRetention = 0; // This would be calculated from total ad revenue - totalDistributed

            // Statistics by cap level
            const levelStats = await this.getRevenueStatsByLevel();

            // Monthly trend (last 12 months)
            const monthlyTrend = await this.getMonthlyRevenueTrend();

            return {
                totalRevenue,
                totalDistributed,
                platformRetention,
                currentMonthRevenue,
                currentMonthDistributed,
                averageRevenuePerUser,
                levelStats,
                monthlyTrend,
            };
        } catch (error) {
            this.logger.error(`Failed to get platform revenue stats: ${error.message}`);
            throw error;
        }
    }

    /**
     * Gets revenue rank for a specific user
     * @param userId User ID
     * @returns User's rank based on total earnings (1-based)
     */
    private async getUserRevenueRank(userId: string): Promise<number> {
        const userTotalEarnings = await this.prisma.adRevenueShare.aggregate({
            where: { userId },
            _sum: { amount: true },
        });

        const userEarnings = userTotalEarnings._sum.amount || 0;

        const usersWithHigherEarnings = await this.prisma.adRevenueShare.groupBy({
            by: ["userId"],
            _sum: { amount: true },
            having: {
                amount: {
                    _sum: {
                        gt: userEarnings,
                    },
                },
            },
        });

        return usersWithHigherEarnings.length + 1;
    }

    /**
     * Gets all eligible users for revenue distribution
     * @returns List of users with their metrics and cap levels
     */
    private async getEligibleUsersForRevenue(): Promise<
        (User & { metrics: UserMetrics | null })[]
    > {
        return await this.prisma.user.findMany({
            where: {
                capLevel: { not: "NONE" }, // Only users with cap levels get revenue
                metrics: { isNot: null }, // Must have metrics
            },
            include: { metrics: true },
        });
    }

    /**
     * Calculates revenue distributions for all eligible users
     * @param users List of eligible users
     * @param totalRevenue Total platform revenue to distribute
     * @returns Revenue distribution calculations
     */
    private async calculateRevenueDistributions(
        users: (User & { metrics: UserMetrics | null })[],
        totalRevenue: number,
    ): Promise<RevenueDistributionResult[]> {
        const distributions: RevenueDistributionResult[] = [];

        // Get all cap level requirements for share percentages
        const capRequirements = await this.prisma.capRequirements.findMany();
        const requirementsMap = new Map(capRequirements.map((req) => [req.capLevel, req]));

        for (const user of users) {
            const requirements = requirementsMap.get(user.capLevel);
            if (!requirements || !user.metrics) continue;

            // Calculate user's share based on their cap level and activity
            const sharePercentage = requirements.adSharePercentage;
            const activityScore = user.metrics.activityScore;

            // Basic distribution - could be enhanced with activity-based multipliers
            const baseAmount = (totalRevenue * sharePercentage) / 100;

            // Activity bonus (up to 50% bonus based on activity score)
            const activityMultiplier = Math.min(1 + (activityScore / 1000) * 0.5, 1.5);
            const finalAmount = baseAmount * activityMultiplier;

            distributions.push({
                userId: user.id,
                capLevel: user.capLevel,
                sharePercentage,
                eligibleAmount: Math.round(finalAmount * 100) / 100, // Round to 2 decimal places
                activityScore,
            });
        }

        return distributions;
    }

    /**
     * Groups distribution results by cap level
     * @param distributions Revenue distributions
     * @returns Grouped distributions by cap level
     */
    private groupDistributionsByLevel(distributions: RevenueDistributionResult[]): Record<
        CapLevel,
        {
            userCount: number;
            totalAmount: number;
            sharePercentage: number;
        }
    > {
        const grouped = distributions.reduce(
            (acc, dist) => {
                if (!acc[dist.capLevel]) {
                    acc[dist.capLevel] = {
                        userCount: 0,
                        totalAmount: 0,
                        sharePercentage: dist.sharePercentage,
                    };
                }

                acc[dist.capLevel].userCount++;
                acc[dist.capLevel].totalAmount += dist.eligibleAmount;

                return acc;
            },
            {} as Record<
                CapLevel,
                { userCount: number; totalAmount: number; sharePercentage: number }
            >,
        );

        return grouped;
    }

    /**
     * Saves revenue distributions to database
     * @param distributions Revenue distributions to save
     * @param month Month of distribution
     * @param year Year of distribution
     */
    private async saveRevenueDistributions(
        distributions: RevenueDistributionResult[],
        month: number,
        year: number,
    ): Promise<void> {
        // Use transaction to ensure all distributions are saved or none
        await this.prisma.$transaction(async (tx) => {
            for (const dist of distributions) {
                await tx.adRevenueShare.create({
                    data: {
                        userId: dist.userId,
                        month,
                        year,
                        amount: dist.eligibleAmount,
                        capLevelAtTime: dist.capLevel,
                        sharePercentage: dist.sharePercentage,
                    },
                });

                // Update user metrics with earnings
                await tx.userMetrics.update({
                    where: { userId: dist.userId },
                    data: {
                        totalEarnings: { increment: dist.eligibleAmount },
                        currentMonthEarnings: { increment: dist.eligibleAmount },
                    },
                });
            }
        });
    }

    /**
     * Creates empty calculation result for when no eligible users found
     */
    private createEmptyCalculationResult(
        month: number,
        year: number,
        isDryRun: boolean,
    ): RevenueCalculationResultDto {
        return {
            totalUsers: 0,
            totalDistributed: 0,
            distributionByLevel: {} as Record<CapLevel, any>,
            month,
            year,
            isDryRun,
            calculatedAt: new Date(),
        };
    }

    /**
     * Gets revenue statistics grouped by cap level
     */
    private async getRevenueStatsByLevel(): Promise<
        Record<
            CapLevel,
            {
                userCount: number;
                totalEarnings: number;
                averageEarnings: number;
                sharePercentage: number;
            }
        >
    > {
        const statsByLevel = await this.prisma.adRevenueShare.groupBy({
            by: ["capLevelAtTime"],
            _count: { userId: true },
            _sum: { amount: true },
        });

        const capRequirements = await this.prisma.capRequirements.findMany();
        const requirementsMap = new Map(
            capRequirements.map((req) => [req.capLevel, req.adSharePercentage]),
        );

        const result = {} as Record<
            CapLevel,
            {
                userCount: number;
                totalEarnings: number;
                averageEarnings: number;
                sharePercentage: number;
            }
        >;

        for (const stat of statsByLevel) {
            const capLevel = stat.capLevelAtTime as CapLevel;
            result[capLevel] = {
                userCount: stat._count.userId,
                totalEarnings: stat._sum.amount || 0,
                averageEarnings: stat._sum.amount ? stat._sum.amount / stat._count.userId : 0,
                sharePercentage: requirementsMap.get(capLevel) || 0,
            };
        }

        return result;
    }

    /**
     * Gets monthly revenue trend for the last 12 months
     */
    private async getMonthlyRevenueTrend(): Promise<
        {
            month: number;
            year: number;
            totalRevenue: number;
            totalDistributed: number;
            activeUsers: number;
        }[]
    > {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const monthlyData = await this.prisma.adRevenueShare.groupBy({
            by: ["month", "year"],
            where: {
                OR: [
                    { year: { gt: twelveMonthsAgo.getFullYear() } },
                    {
                        AND: [
                            { year: twelveMonthsAgo.getFullYear() },
                            { month: { gte: twelveMonthsAgo.getMonth() + 1 } },
                        ],
                    },
                ],
            },
            _sum: { amount: true },
            _count: { userId: true },
            orderBy: [{ year: "asc" }, { month: "asc" }],
        });

        return monthlyData.map((data) => ({
            month: data.month,
            year: data.year,
            totalRevenue: data._sum.amount || 0,
            totalDistributed: data._sum.amount || 0,
            activeUsers: data._count.userId,
        }));
    }
}
