/**
 * June 26 soft-language earnings contract — consumer-facing public payloads must not
 * expose raw ad-revenue share percentages. Exact figures belong on the personal dashboard only.
 */

export const SOFT_EARNINGS_FORBIDDEN_PUBLIC_FIELDS = [
    "effectiveSharePercentage",
    "nominalSharePercentage",
    "adSharePercentage",
    "sharePercentage",
    "totalEarnings",
    "currentMonthEarnings",
    "paidOrderBalance",
    "adRevenueAmount",
] as const;

export const SOFT_EARNINGS_PUBLIC_FIELDS = [
    "earningLevel.headline",
    "cap.label",
    "cap.level",
] as const;

export const SOFT_EARNINGS_PERSONAL_DASHBOARD_PATHS = [
    "GET /cap-level/status/me",
    "GET /cap-level/earnings/me",
    "GET /user-metrics (authenticated self)",
    "GET /user-profile/reputation-passport (isOwnProfile)",
] as const;

export const SOFT_EARNINGS_CONTRACT = {
    version: "2026-08-23",
    rule: "Public and third-party member views use soft-language earning headlines only. Exact revenue percentages and dollar amounts are returned under privateEarnings / privateSummary blocks or personal-dashboard routes.",
    forbiddenOnPublicViews: [...SOFT_EARNINGS_FORBIDDEN_PUBLIC_FIELDS],
    allowedPublicHeadlines: [...SOFT_EARNINGS_PUBLIC_FIELDS],
    personalDashboardRoutes: [...SOFT_EARNINGS_PERSONAL_DASHBOARD_PATHS],
};
