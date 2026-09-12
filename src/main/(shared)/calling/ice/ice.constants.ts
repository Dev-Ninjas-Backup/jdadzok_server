/**
 * STUN/TURN configuration for calls (Issue #40).
 *
 * Calls used to be STUN-only. STUN can only discover a peer's public address, so
 * a call connects only when both sides are directly reachable — same Wi-Fi/LAN,
 * or a NAT that happens to allow it. On cellular and CGNAT neither side has a
 * routable address to offer, no candidate pair succeeds, and the call sits on
 * "Connecting…" forever. A TURN relay is the fallback path for exactly that case.
 */

/** Env vars consumed by the ICE builder. */
export const ICE_ENV = {
    /** Comma-separated STUN URLs. Defaults to {@link DEFAULT_STUN_URLS}. */
    STUN_URL: "STUN_URL",
    /**
     * Comma-separated TURN URLs, e.g.
     * `turn:turn.example.com:3478?transport=udp,turn:turn.example.com:3478?transport=tcp`.
     * Absent or empty disables TURN, leaving calls STUN-only (the previous behaviour).
     */
    TURN_URL: "TURN_URL",
    /** Shared secret for coturn `use-auth-secret`. Preferred over a static password. */
    TURN_SECRET: "TURN_SECRET",
    /** Static credentials, for a TURN server that has no REST auth configured. */
    TURN_USERNAME: "TURN_USERNAME",
    TURN_PASSWORD: "TURN_PASSWORD",
    /** Lifetime of a minted credential, in seconds. */
    TURN_TTL_SECONDS: "TURN_TTL_SECONDS",
    /** coturn realm. Only informational to clients, but it must match the server. */
    TURN_REALM: "TURN_REALM",
} as const;

export const DEFAULT_STUN_URLS = [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302",
    "stun:stun2.l.google.com:19302",
    "stun:stun3.l.google.com:19302",
    "stun:stun4.l.google.com:19302",
];

/**
 * How long a minted TURN credential remains valid.
 *
 * coturn validates the expiry when an allocation is created, not continuously, so
 * this only has to outlast a call plus any ICE restart. Four hours matches what the
 * hosted TURN vendors hand out.
 */
export const DEFAULT_TURN_TTL_SECONDS = 4 * 60 * 60;

/**
 * Identity the credential is minted for when the caller has nothing more specific
 * to offer. coturn ignores the field, but it appears in its logs and accounting.
 */
export const DEFAULT_TURN_IDENTITY = "synqulan";
