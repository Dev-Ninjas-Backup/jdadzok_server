import { CapLevel } from "@constants/enums";
import { CapLevelJobType } from "../constants";

/**
 * Job data interfaces
 */
export interface UserEligibilityJobData {
    userId: string;
    triggerAction?: keyof CapLevelJobType; // What action triggered this check
}

export interface UserPromotionJobData {
    userId: string;
    targetLevel?: CapLevel;
    bypassVerification?: boolean;
    triggeredBy?: string; // admin ID or 'system'
}

export interface UserMetricsUpdateJobData {
    userId: string;
    metricsUpdate: {
        totalPosts?: number;
        totalComments?: number;
        totalLikes?: number;
        totalShares?: number;
        totalFollowers?: number;
        volunteerHours?: number;
        completedProjects?: number;
    };
    recalculateScore?: boolean;
}

export interface BatchPromotionJobData {
    capLevel: CapLevel;
    maxUsers?: number;
    dryRun?: boolean;
    adminId?: string;
}

export interface MonthlyRevenueJobData {
    month: number;
    year: number;
    totalPlatformRevenue: number;
    dryRun?: boolean;
    adminId?: string;
}

export interface VolunteerHoursJobData {
    userId: string;
    hours: number;
    projectId?: string;
    workDescription?: string;
    workDate?: string;
}

export interface BatchMetricsJobData {
    userIds?: string[];
    capLevel?: CapLevel;
    lastUpdatedBefore?: string;
    batchSize?: number;
    adminId?: string;
}
