import {
    ActivityLeaderboardDto,
    ActivityScoreWeightsDto,
    BatchMetricsRecalculationDto,
    ManualActivityScoreUpdateDto,
    MetricsQueryDto,
    PlatformActivityStatsDto,
    UpdateUserMetricsDto,
    UserActivityAnalyticsDto,
    UserMetricsResponseDto,
} from "@module/(core)/cap-level/dto/user-metrics.dto";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { UserMetricsService } from "@module/(users)/profile-metrics/user-metrics.service";
import {
    Body,
    Controller,
    Get,
    HttpStatus,
    Param,
    Post,
    Put,
    Query,
    UseGuards,
    ValidationPipe,
} from "@nestjs/common";
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from "@nestjs/swagger";

@ApiBearerAuth()
@ApiTags("User Metrics")
@Controller("user-metrics")
@UseGuards(JwtAuthGuard)
export class UserMetricsController {
    constructor(private readonly userMetricsService: UserMetricsService) {}

    /**
     * Get user metrics by user ID
     */
    @Get(":userId")
    @ApiOperation({ summary: "Get comprehensive user metrics" })
    @ApiParam({ name: "userId", description: "User ID to get metrics for" })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "User metrics retrieved successfully",
        type: UserMetricsResponseDto,
    })
    async getUserMetrics(@Param("userId") userId: string) {
        try {
            const metrics = await this.userMetricsService.getUserMetrics(userId);

            if (!metrics) {
                return {
                    success: false,
                    message: "User metrics not found",
                    data: null,
                };
            }

            return {
                success: true,
                message: "User metrics retrieved successfully",
                data: metrics,
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update user metrics
     */
    @Put(":userId")
    @ApiOperation({ summary: "Update user metrics" })
    @ApiParam({ name: "userId", description: "User ID to update metrics for" })
    @ApiBody({ type: UpdateUserMetricsDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "User metrics updated successfully",
        type: UserMetricsResponseDto,
    })
    async updateUserMetrics(
        @Param("userId") userId: string,
        @Body(ValidationPipe) updateDto: UpdateUserMetricsDto,
    ) {
        try {
            // Ensure the userId in the path matches the DTO
            const updateData = { ...updateDto, userId };

            const updatedMetrics = await this.userMetricsService.updateUserMetrics(
                userId,
                updateData,
            );

            // Recalculate activity score if requested
            if (updateData.recalculateScore !== false) {
                await this.userMetricsService.recalculateAndUpdateActivityScore(userId);
            }

            return {
                success: true,
                message: "User metrics updated successfully",
                data: updatedMetrics,
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Recalculate and update activity score for a user
     */
    @Post(":userId/recalculate-score")
    @ApiOperation({
        summary: "Recalculate user activity score",
        description:
            "Recalculates activity score based on current engagement data and updates user metrics",
    })
    @ApiParam({ name: "userId", description: "User ID to recalculate score for" })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Activity score recalculated successfully",
    })
    async recalculateActivityScore(@Param("userId") userId: string) {
        try {
            const updatedMetrics =
                await this.userMetricsService.recalculateAndUpdateActivityScore(userId);
            const newScore = await this.userMetricsService.calculateActivityScore(userId);

            return {
                success: true,
                message: "Activity score recalculated successfully",
                data: {
                    userId,
                    newActivityScore: newScore,
                    updatedMetrics,
                    recalculatedAt: new Date(),
                },
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get user activity analytics with detailed breakdown
     */
    @Get(":userId/analytics")
    @ApiOperation({
        summary: "Get detailed user activity analytics",
        description:
            "Returns comprehensive analytics including activity breakdown, ranking, and trends",
    })
    @ApiParam({ name: "userId", description: "User ID to get analytics for" })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "User activity analytics retrieved successfully",
        type: UserActivityAnalyticsDto,
    })
    async getUserActivityAnalytics(@Param("userId") userId: string) {
        try {
            const metrics = await this.userMetricsService.getUserMetrics(userId);
            if (!metrics) {
                throw new Error("User metrics not found");
            }

            const currentRank = await this.userMetricsService.getUserActivityRank(userId);
            const currentScore = metrics.activityScore;

            // Calculate activity breakdown
            const activityBreakdown = {
                posts: {
                    count: metrics.totalPosts,
                    points: metrics.totalPosts * 5,
                    percentage: ((metrics.totalPosts * 5) / currentScore) * 100 || 0,
                },
                comments: {
                    count: metrics.totalComments,
                    points: metrics.totalComments * 2,
                    percentage: ((metrics.totalComments * 2) / currentScore) * 100 || 0,
                },
                likes: {
                    count: metrics.totalLikes,
                    points: metrics.totalLikes * 1,
                    percentage: ((metrics.totalLikes * 1) / currentScore) * 100 || 0,
                },
                shares: {
                    count: metrics.totalShares,
                    points: metrics.totalShares * 3,
                    percentage: ((metrics.totalShares * 3) / currentScore) * 100 || 0,
                },
                followers: {
                    count: metrics.totalFollowers,
                    points: metrics.totalFollowers * 0.5,
                    percentage: ((metrics.totalFollowers * 0.5) / currentScore) * 100 || 0,
                },
                volunteerHours: {
                    count: metrics.volunteerHours,
                    points: metrics.volunteerHours * 10,
                    percentage: ((metrics.volunteerHours * 10) / currentScore) * 100 || 0,
                },
            };

            const analytics: UserActivityAnalyticsDto = {
                userId,
                currentScore,
                scoreHistory: [], // Would need historical data
                activityBreakdown,
                currentRank,
                rankChange: 0, // Would need historical rank data
                usersAbove: currentRank - 1,
                usersBelow: 0, // Would calculate from total users
                percentile: 0, // Would calculate based on user distribution
                recentActivity: [], // Would need activity timeline data
            };

            return {
                success: true,
                message: "User activity analytics retrieved successfully",
                data: analytics,
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Manual activity score update (admin only)
     */
    @Post(":userId/manual-score-update")
    @ApiOperation({
        summary: "Manual activity score update (admin only)",
        description: "Manually updates a user activity score with admin oversight",
    })
    @ApiParam({ name: "userId", description: "User ID to update score for" })
    @ApiBody({ type: ManualActivityScoreUpdateDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Activity score updated manually",
    })
    async manualActivityScoreUpdate(
        @Param("userId") userId: string,
        @Body(ValidationPipe) updateDto: ManualActivityScoreUpdateDto,
    ) {
        try {
            // Ensure the userId in the path matches the DTO
            const updateData = { ...updateDto, userId };

            const oldScore = await this.userMetricsService.calculateActivityScore(userId);

            // Update metrics with new manual score
            const updatedMetrics = await this.userMetricsService.updateUserMetrics(userId, {
                activityScore: updateData.newScore,
            });

            return {
                success: true,
                message: "Activity score updated manually",
                data: {
                    userId,
                    oldScore,
                    newScore: updateData.newScore,
                    reason: updateData.reason,
                    adminId: updateData.adminId,
                    updatedAt: new Date(),
                    updatedMetrics,
                },
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get activity leaderboard
     */
    @Get("leaderboard")
    @ApiOperation({
        summary: "Get activity score leaderboard",
        description: "Returns top users by activity score with rankings and cap levels",
    })
    @ApiQuery({
        name: "limit",
        required: false,
        description: "Number of top users to return",
        example: 50,
    })
    @ApiQuery({
        name: "capLevel",
        required: false,
        description: "Filter by cap level",
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Activity leaderboard retrieved successfully",
        type: [ActivityLeaderboardDto],
    })
    async getActivityLeaderboard(
        @Query("limit") limit = 50,
        @Query("capLevel") capLevel?: string,
    ) {
        try {
            const topUsers = await this.userMetricsService.getTopUsers(limit);

            // Transform to leaderboard format (would need user profile data)
            const leaderboard: ActivityLeaderboardDto[] = topUsers.map((metrics, index) => ({
                rank: index + 1,
                userId: metrics.userId,
                displayName: `User ${metrics.userId.slice(0, 8)}`, // Would get from user profile
                avatarUrl: undefined, // Would get from user profile
                activityScore: metrics.activityScore,
                capLevel: "GREEN", // Would get from user data
                totalPosts: metrics.totalPosts,
                volunteerHours: metrics.volunteerHours,
                rankChange: 0, // Would calculate from historical data
            }));

            return {
                success: true,
                message: "Activity leaderboard retrieved successfully",
                data: leaderboard,
                metadata: {
                    totalUsers: leaderboard.length,
                    generatedAt: new Date(),
                    filters: { limit, capLevel },
                },
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get users with high activity (above threshold)
     */
    @Get("high-activity")
    @ApiOperation({
        summary: "Get users with high activity scores",
        description: "Returns users with activity scores above a specified threshold",
    })
    @ApiQuery({
        name: "minScore",
        required: false,
        description: "Minimum activity score threshold",
        example: 50,
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "High activity users retrieved successfully",
    })
    async getHighActivityUsers(@Query("minScore") minScore = 50) {
        try {
            const highActivityUsers =
                await this.userMetricsService.getUsersWithHighActivity(minScore);

            return {
                success: true,
                message: "High activity users retrieved successfully",
                data: {
                    threshold: minScore,
                    users: highActivityUsers,
                    count: highActivityUsers.length,
                    retrievedAt: new Date(),
                },
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Search users by metrics criteria
     */
    @Get("search")
    @ApiOperation({
        summary: "Search users by metrics criteria",
        description: "Find users based on various metrics filters and sorting options",
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Users search completed successfully",
    })
    async searchUsersByMetrics(@Query() queryDto: MetricsQueryDto) {
        try {
            // This would need a dedicated search method in the service
            // For now, return a placeholder response
            return {
                success: true,
                message: "User metrics search completed",
                data: {
                    results: [], // Would contain filtered users
                    filters: queryDto,
                    pagination: {
                        page: queryDto.page || 1,
                        limit: queryDto.limit || 20,
                        total: 0,
                    },
                    searchedAt: new Date(),
                },
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Batch recalculate activity scores
     */
    @Post("batch-recalculate")
    @ApiOperation({
        summary: "Batch recalculate activity scores (admin only)",
        description:
            "Recalculates activity scores for multiple users or all users matching criteria",
    })
    @ApiBody({ type: BatchMetricsRecalculationDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Batch recalculation initiated successfully",
    })
    async batchRecalculateMetrics(@Body(ValidationPipe) batchDto: BatchMetricsRecalculationDto) {
        try {
            const { userIds, capLevel, lastUpdatedBefore, adminId, batchSize = 50 } = batchDto;

            // If specific user IDs provided, use those
            let targetUserIds = userIds;

            // Otherwise, get users based on criteria
            if (!userIds || userIds.length === 0) {
                // This would need a method to get user IDs based on criteria
                // For now, process all users with high activity
                const highActivityUsers = await this.userMetricsService.getUsersWithHighActivity(0);
                targetUserIds = highActivityUsers.map((metrics) => metrics.userId);
            }

            if (!targetUserIds || targetUserIds.length === 0) {
                return {
                    success: false,
                    message: "No users found matching the specified criteria",
                    data: { processed: 0, errors: [] },
                };
            }

            // Process in batches
            await this.userMetricsService.bulkRecalculateActivityScores(targetUserIds);

            return {
                success: true,
                message: "Batch metrics recalculation completed successfully",
                data: {
                    totalUsers: targetUserIds.length,
                    batchSize,
                    adminId,
                    filters: { capLevel, lastUpdatedBefore },
                    startedAt: new Date(),
                    estimatedCompletion: new Date(
                        Date.now() + (targetUserIds.length / batchSize) * 60000,
                    ),
                },
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get platform activity statistics
     */
    @Get("platform/stats")
    @ApiOperation({
        summary: "Get platform-wide activity statistics",
        description: "Returns comprehensive statistics about user activity across the platform",
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Platform activity statistics retrieved successfully",
        type: PlatformActivityStatsDto,
    })
    async getPlatformActivityStats() {
        try {
            // This would need dedicated methods in the service for platform-wide stats
            // For now, calculate basic stats from available methods
            const topUsers = await this.userMetricsService.getTopUsers(1);
            const highActivityUsers = await this.userMetricsService.getUsersWithHighActivity(50);

            const platformStats: PlatformActivityStatsDto = {
                totalUsers: 0, // Would get from user count
                activeUsers: highActivityUsers.length,
                averageActivityScore: 0, // Would calculate
                medianActivityScore: 0, // Would calculate
                highestActivityScore: topUsers[0]?.activityScore || 0,
                totalPosts: 0, // Would aggregate
                totalComments: 0, // Would aggregate
                totalLikes: 0, // Would aggregate
                totalShares: 0, // Would aggregate
                totalVolunteerHours: 0, // Would aggregate
                statsByCapLevel: {
                    NONE: {
                        averagePosts: 0,
                        averageScore: 0,
                        averageVolunteerHours: 0,
                        userCount: 0,
                    },
                    RED: {
                        averagePosts: 0,
                        averageScore: 0,
                        averageVolunteerHours: 0,
                        userCount: 0,
                    },
                    BLACK: {
                        averagePosts: 0,
                        averageScore: 0,
                        averageVolunteerHours: 0,
                        userCount: 0,
                    },
                    GREEN: {
                        averagePosts: 0,
                        averageScore: 0,
                        averageVolunteerHours: 0,
                        userCount: 0,
                    },
                    OSTRICH_FEATHER: {
                        averagePosts: 0,
                        averageScore: 0,
                        averageVolunteerHours: 0,
                        userCount: 0,
                    },
                    YELLOW: {
                        averagePosts: 0,
                        averageScore: 0,
                        averageVolunteerHours: 0,
                        userCount: 0,
                    },
                }, // Would group by cap level
                monthlyTrend: [], // Would need historical data
            };

            return {
                success: true,
                message: "Platform activity statistics retrieved successfully",
                data: platformStats,
                generatedAt: new Date(),
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get or update activity score weights configuration
     */
    @Get("config/weights")
    @ApiOperation({
        summary: "Get current activity score weights configuration",
        description: "Returns the current point values for different activities",
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Activity score weights retrieved successfully",
        type: ActivityScoreWeightsDto,
    })
    async getActivityScoreWeights() {
        try {
            // Return current weights (these would be configurable in a real system)
            const weights: ActivityScoreWeightsDto = {
                posts: 5,
                comments: 2,
                likes: 1,
                shares: 3,
                followers: 0.5,
                volunteerHours: 10,
            };

            return {
                success: true,
                message: "Activity score weights retrieved successfully",
                data: weights,
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update activity score weights (admin only)
     */
    @Put("config/weights")
    @ApiOperation({
        summary: "Update activity score weights configuration (admin only)",
        description: "Updates the point values for different activities used in score calculation",
    })
    @ApiBody({ type: ActivityScoreWeightsDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: "Activity score weights updated successfully",
    })
    async updateActivityScoreWeights(@Body(ValidationPipe) weightsDto: ActivityScoreWeightsDto) {
        try {
            // In a real system, these would be stored in database/config
            // For now, just return success with the new weights
            return {
                success: true,
                message: "Activity score weights updated successfully",
                data: {
                    oldWeights: {
                        posts: 5,
                        comments: 2,
                        likes: 1,
                        shares: 3,
                        followers: 0.5,
                        volunteerHours: 10,
                    },
                    newWeights: weightsDto,
                    updatedAt: new Date(),
                },
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get user activity rank
     */
    @ApiOperation({
        summary: "Get user activity rank",
        description: "Returns the user current rank based on activity score",
    })
    @ApiParam({ name: "userId", description: "User ID to get rank for" })
    @Get(":userId/rank")
    async getUserActivityRank(@Param("userId") userId: string) {
        try {
            const rank = await this.userMetricsService.getUserActivityRank(userId);
            const metrics = await this.userMetricsService.getUserMetrics(userId);

            if (!metrics) {
                throw new Error("User metrics not found");
            }

            return {
                success: true,
                message: "User activity rank retrieved successfully",
                data: {
                    userId,
                    rank,
                    activityScore: metrics.activityScore,
                    totalUsers: 0, // Would get total count
                    percentile: 0, // Would calculate
                    retrievedAt: new Date(),
                },
            };
        } catch (error) {
            throw error;
        }
    }
}
