/** Guest explore API contract — June 26 unauthenticated browse + locked identity actions. */

export interface GuestLockedAction {
    action: string;
    label: string;
    requiresAuth: true;
    route: string;
    method: string;
}

export interface GuestPublicRoute {
    method: string;
    path: string;
    description: string;
}

export const GUEST_JOIN_PROMPT =
    "Sign in or create a free account to apply, connect, message, follow, or book opportunities.";

export const GUEST_LOCKED_ACTIONS: GuestLockedAction[] = [
    {
        action: "apply_volunteer",
        label: "Apply to a volunteer project",
        requiresAuth: true,
        method: "POST",
        route: "/volunteer/apply",
    },
    {
        action: "log_hours",
        label: "Log volunteer contribution hours",
        requiresAuth: true,
        method: "PATCH",
        route: "/volunteer/log-hours/:applicationId",
    },
    {
        action: "bridge_book",
        label: "Book a Bridge gig or expertise listing",
        requiresAuth: true,
        method: "POST",
        route: "/bridge/:id/book",
    },
    {
        action: "connect",
        label: "Send a mutual Connect request",
        requiresAuth: true,
        method: "POST",
        route: "/friend-request",
    },
    {
        action: "follow",
        label: "Follow a member or organisation",
        requiresAuth: true,
        method: "POST",
        route: "/follows/toggle",
    },
    {
        action: "message",
        label: "Start a chat thread",
        requiresAuth: true,
        method: "POST",
        route: "/chat/private",
    },
    {
        action: "call",
        label: "Start a verified or general call",
        requiresAuth: true,
        method: "POST",
        route: "/calling",
    },
];

export const GUEST_PUBLIC_ROUTES: GuestPublicRoute[] = [
    {
        method: "GET",
        path: "/explore/guest/contract",
        description: "Guest mode contract (locked actions + public route index)",
    },
    {
        method: "GET",
        path: "/explore/guest",
        description: "Aggregated guest home: opportunities, Bridge, NGOs, communities, impact",
    },
    {
        method: "GET",
        path: "/explore/guest/opportunities",
        description: "Browse active volunteer projects (no PII)",
    },
    {
        method: "GET",
        path: "/explore/guest/opportunities/:projectId",
        description: "Volunteer project detail for guests",
    },
    {
        method: "GET",
        path: "/explore/guest/impact",
        description: "Platform impact snapshot aggregates",
    },
    {
        method: "GET",
        path: "/sponsored/opportunities",
        description: "Discover corporate-sponsored volunteer projects and Bridge listings",
    },
    {
        method: "GET",
        path: "/sponsored/opportunities/:id",
        description: "Sponsored opportunity detail",
    },
    {
        method: "GET",
        path: "/contracts/soft-earnings",
        description: "Soft-language Cap earnings API contract (no hard % on public views)",
    },
    {
        method: "GET",
        path: "/leaderboard/contribution",
        description: "Recognition leaderboard ranked by verified hours, mentoring, and endorsements",
    },
    {
        method: "GET",
        path: "/explore/trending",
        description: "Trending NGOs, communities, and profiles",
    },
    {
        method: "GET",
        path: "/explore/ngos",
        description: "Top NGOs by followers",
    },
    {
        method: "GET",
        path: "/explore/communities",
        description: "Top communities by followers",
    },
    {
        method: "GET",
        path: "/bridge",
        description: "Discover open Bridge listings (Cap-weighted)",
    },
    {
        method: "GET",
        path: "/bridge/:id",
        description: "Bridge listing detail",
    },
];

export function guestExploreEnvelope<T>(data: T) {
    return {
        guestMode: true as const,
        joinPrompt: GUEST_JOIN_PROMPT,
        lockedActions: GUEST_LOCKED_ACTIONS,
        data,
    };
}
