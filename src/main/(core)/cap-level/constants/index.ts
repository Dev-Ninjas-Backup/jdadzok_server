/**
 * Job types for cap level processing
 */
export const capLevelJobType = {
    // User-specific jobs
    CALCULATE_USER_ELIGIBILITY: "calculate-user-eligibility",
    PROMOTE_USER: "promote-user",
    UPDATE_USER_METRICS: "update-user-metrics",
    RECALCULATE_ACTIVITY_SCORE: "recalculate-activity-score",

    // Batch processing jobs
    BATCH_PROMOTE_USERS: "batch-promote-users",
    BATCH_RECALCULATE_METRICS: "batch-recalculate-metrics",

    // Revenue processing jobs
    CALCULATE_MONTHLY_REVENUE: "calculate-monthly-revenue",
    DISTRIBUTE_REVENUE: "distribute-revenue",

    // Volunteer processing jobs
    PROCESS_VOLUNTEER_HOURS: "process-volunteer-hours",
    CHECK_SERVICE_COMPLETION: "check-service-completion",

    // Maintenance jobs
    CLEANUP_OLD_DATA: "cleanup-old-data",
    GENERATE_REPORTS: "generate-reports",
} as const;

export type CapLevelJobType = typeof capLevelJobType;
