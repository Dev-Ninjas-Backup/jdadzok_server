/** Anti-abuse thresholds for auto-verifying mentorship call VolunteerHours. Overridable via env. */
export const DEFAULT_MENTORSHIP_MIN_DURATION_MINUTES = 10;
export const DEFAULT_MENTORSHIP_MAX_DAILY_HOURS_PER_MENTOR = 4;
export const DEFAULT_MENTORSHIP_MAX_DAILY_HOURS_PER_PAIR = 2;
export const DEFAULT_MENTORSHIP_MAX_HOURS_PER_CALL = 3;

/** How long an auto-verified hour stays disputable before the credit is final. */
export const MENTORSHIP_AUTO_VERIFY_DISPUTE_WINDOW_DAYS = 14;
