import { BadRequestException, Injectable } from "@nestjs/common";
import { CapRequirements, User, UserMetrics } from "@prisma/client";
import { UserMetricsService } from "../../(users)/profile-metrics/user-metrics.service";
import { CapLevel } from "../../../constants/enums";
import { CapLevelRepository } from "./cap-lavel.repository";

interface CapEligibilityResult {
    currentLevel: CapLevel;
    eligibleLevel: CapLevel;
    canPromote: boolean;
    requirements: CapRequirements | null;
    missingRequirements: string[];
    activityScore: number;
    volunteerHours: number;
}

interface UserCapStatus {
    user: User;
    currentLevel: CapLevel;
    currentRequirements: CapRequirements | null;
    nextLevel: CapLevel | null;
    nextRequirements: CapRequirements | null;
    metrics: UserMetrics | null;
    eligibility: CapEligibilityResult;
    progressPercentage: number;
    earning: {
        effectiveSharePercentage: number;
        nominalSharePercentage: number;
        earningAtRedRate: boolean;
        blackVolunteerHoursRequired: number | null;
    };
}

@Injectable()
export class CapLevelService {
    constructor(
        private readonly repository: CapLevelRepository,
        private readonly userMetricsService: UserMetricsService,
    ) {}

    private readonly capLevelOrder: CapLevel[] = [
        "NONE",
        "GREEN",
        "YELLOW",
        "RED",
        "BLACK",
    ];

    /** Parallel invitation track — never a sequential “next” after Black */
    private readonly parallelCapLevels = new Set<CapLevel>(["SKY_BLUE"]);

    async getUserCapStatus(userId: string): Promise<UserCapStatus> {
        // Get user with metrics
        const userWithMetrics = await this.repository.getUserWithMetrics(userId);
        if (!userWithMetrics) {
            throw new BadRequestException("User not found");
        }

        // Ensure user has metrics
        let metrics = userWithMetrics.metrics;
        if (!metrics) {
            metrics = await this.repository.createUserMetricsIfNotExists(userId);
            await this.userMetricsService.recalculateAndUpdateActivityScore(userId);
            metrics = await this.userMetricsService.getUserMetrics(userId);
        }

        // Get current and next level requirements
        const currentRequirements = await this.repository.getCapRequirements(
            userWithMetrics.capLevel,
        );
        const nextLevel = this.getNextCapLevel(userWithMetrics.capLevel);
        const nextRequirements = nextLevel
            ? await this.repository.getCapRequirements(nextLevel)
            : null;

        // Calculate eligibility
        const eligibility = await this.calculateCapEligibility(userId);

        // Calculate progress percentage to next level
        const progressPercentage = await this.calculateProgressPercentage(
            userWithMetrics.capLevel,
            metrics!,
            nextRequirements,
        );

        const earning = await this.getEffectiveAdSharePercentage(
            userWithMetrics.capLevel,
            metrics!.volunteerHours,
        );

        return {
            user: userWithMetrics,
            currentLevel: userWithMetrics.capLevel,
            currentRequirements,
            nextLevel,
            nextRequirements,
            metrics,
            eligibility,
            progressPercentage,
            earning,
        };
    }

    async calculateCapEligibility(userId: string): Promise<CapEligibilityResult> {
        const userWithMetrics = await this.repository.getUserWithMetrics(userId);
        if (!userWithMetrics) {
            throw new BadRequestException("User not found");
        }

        // Ensure metrics exist and are up to date
        await this.userMetricsService.recalculateAndUpdateActivityScore(userId);
        const metrics = await this.userMetricsService.getUserMetrics(userId);

        if (!metrics) {
            throw new BadRequestException("User metrics not found");
        }

        const currentLevel = userWithMetrics.capLevel;
        let eligibleLevel = currentLevel;
        let canPromote = false;
        let requirements: CapRequirements | null = null;
        const missingRequirements: string[] = [];

        // Check each level starting from current + 1 (ladder only — skip Sky Blue parallel track)
        const currentLevelIndex = this.capLevelOrder.indexOf(
            this.parallelCapLevels.has(currentLevel) ? "BLACK" : currentLevel,
        );

        for (let i = Math.max(currentLevelIndex + 1, 0); i < this.capLevelOrder.length; i++) {
            const checkLevel = this.capLevelOrder[i];
            if (this.parallelCapLevels.has(checkLevel)) continue;

            const levelRequirements = await this.repository.getCapRequirements(checkLevel);

            if (!levelRequirements) continue;

            const meetsRequirements = this.checkLevelRequirements(
                metrics,
                levelRequirements,
                missingRequirements,
            );

            if (meetsRequirements) {
                eligibleLevel = checkLevel;
                canPromote = true;
                requirements = levelRequirements;
                missingRequirements.length = 0; // Clear missing requirements
            } else {
                // Stop at first level we don't meet requirements for
                if (!requirements) {
                    requirements = levelRequirements;
                }
                break;
            }
        }

        // Sky Blue is invitation-only — never auto-eligible via ladder
        if (currentLevel === "SKY_BLUE") {
            return {
                currentLevel,
                eligibleLevel: currentLevel,
                canPromote: false,
                requirements: await this.repository.getCapRequirements("SKY_BLUE"),
                missingRequirements: [],
                activityScore: metrics.activityScore,
                volunteerHours: metrics.volunteerHours,
            };
        }

        return {
            currentLevel,
            eligibleLevel,
            canPromote: canPromote && eligibleLevel !== currentLevel,
            requirements,
            missingRequirements,
            activityScore: metrics.activityScore,
            volunteerHours: metrics.volunteerHours,
        };
    }

    private checkLevelRequirements(
        metrics: UserMetrics,
        requirements: CapRequirements,
        missingRequirements: string[],
    ): boolean {
        let meetsAll = true;

        // Check activity score requirement
        if (
            requirements.minActivityScore &&
            metrics.activityScore < requirements.minActivityScore
        ) {
            missingRequirements.push(
                `Activity Score: ${metrics.activityScore}/${requirements.minActivityScore}`,
            );
            meetsAll = false;
        }

        // Check volunteer hours requirement
        if (
            requirements.minVolunteerHours &&
            metrics.volunteerHours < requirements.minVolunteerHours
        ) {
            missingRequirements.push(
                `Volunteer Hours: ${metrics.volunteerHours}/${requirements.minVolunteerHours}`,
            );
            meetsAll = false;
        }

        // Note: Admin verification and nomination checks are handled separately
        if (requirements.requiresVerification) {
            missingRequirements.push("Admin verification required");
            // Don't set meetsAll = false here, as this is handled in promotion logic
        }

        if (requirements.requiresNomination) {
            missingRequirements.push("Panel nomination required");
            // Don't set meetsAll = false here, as this is handled in promotion logic
        }

        return meetsAll;
    }

    async getAllCapRequirements(): Promise<CapRequirements[]> {
        return await this.repository.getAllCapRequirements();
    }

    async getCapRequirements(capLevel: CapLevel): Promise<CapRequirements | null> {
        return await this.repository.getCapRequirements(capLevel);
    }

    private getNextCapLevel(currentLevel: CapLevel): CapLevel | null {
        if (this.parallelCapLevels.has(currentLevel)) {
            return null;
        }
        const currentIndex = this.capLevelOrder.indexOf(currentLevel);
        if (currentIndex === -1 || currentIndex === this.capLevelOrder.length - 1) {
            return null;
        }
        return this.capLevelOrder[currentIndex + 1];
    }

    /**
     * Sky Blue earns at Red ad-share until Black-level volunteering hours are met,
     * then uses the full Sky Blue CapRequirements.adSharePercentage.
     */
    async getEffectiveAdSharePercentage(
        capLevel: CapLevel,
        volunteerHours: number,
    ): Promise<{
        effectiveSharePercentage: number;
        nominalSharePercentage: number;
        earningAtRedRate: boolean;
        blackVolunteerHoursRequired: number | null;
    }> {
        const requirements = await this.repository.getCapRequirements(capLevel);
        const nominal = requirements?.adSharePercentage ?? 0;

        if (capLevel !== "SKY_BLUE") {
            return {
                effectiveSharePercentage: nominal,
                nominalSharePercentage: nominal,
                earningAtRedRate: false,
                blackVolunteerHoursRequired: null,
            };
        }

        const blackReq = await this.repository.getCapRequirements("BLACK");
        const redReq = await this.repository.getCapRequirements("RED");
        const threshold = blackReq?.minVolunteerHours ?? 320;
        const redShare = redReq?.adSharePercentage ?? 20;

        if (volunteerHours >= threshold) {
            return {
                effectiveSharePercentage: nominal,
                nominalSharePercentage: nominal,
                earningAtRedRate: false,
                blackVolunteerHoursRequired: threshold,
            };
        }

        return {
            effectiveSharePercentage: redShare,
            nominalSharePercentage: nominal,
            earningAtRedRate: true,
            blackVolunteerHoursRequired: threshold,
        };
    }

    private async calculateProgressPercentage(
        currentLevel: CapLevel,
        metrics: UserMetrics,
        nextRequirements: CapRequirements | null,
    ): Promise<number> {
        if (!nextRequirements) return 100; // Max level reached

        let progress = 0;
        let totalRequirements = 0;

        // Activity score progress
        if (nextRequirements.minActivityScore) {
            totalRequirements++;
            const activityProgress = Math.min(
                (metrics.activityScore / nextRequirements.minActivityScore) * 100,
                100,
            );
            progress += activityProgress;
        }

        // Volunteer hours progress
        if (nextRequirements.minVolunteerHours) {
            totalRequirements++;
            const volunteerProgress = Math.min(
                (metrics.volunteerHours / nextRequirements.minVolunteerHours) * 100,
                100,
            );
            progress += volunteerProgress;
        }

        // If no quantifiable requirements, check if at max for current level
        if (totalRequirements === 0) {
            return currentLevel === this.capLevelOrder[this.capLevelOrder.length - 1] ? 100 : 0;
        }

        return Math.round(progress / totalRequirements);
    }

    async getCapLevelStats(): Promise<Record<CapLevel, number>> {
        return await this.repository.getCapLevelStats();
    }

    async getUsersEligibleForPromotion(capLevel: CapLevel): Promise<User[]> {
        const users = await this.repository.getUsersEligibleForPromotion(capLevel);
        return users.map((user) => ({
            ...user,
            metrics: undefined, // Remove metrics from response for cleaner data
        }));
    }
}
