import { createHmac } from "node:crypto";

import type { ConfigService } from "@nestjs/config";

import {
    DEFAULT_STUN_URLS,
    DEFAULT_TURN_IDENTITY,
    DEFAULT_TURN_TTL_SECONDS,
    ICE_ENV,
} from "./ice.constants";

/** A single entry of an `RTCConfiguration.iceServers` array. */
export interface IceServer {
    urls: string;
    username?: string;
    credential?: string;
}

/**
 * Reads config through `get` only, so the builder can be driven by a plain stub in
 * tests instead of booting Nest.
 */
type EnvLike = Pick<ConfigService, "get">;

const splitList = (raw?: string | null): string[] =>
    (raw ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

const readString = (config: EnvLike, key: string): string | undefined => {
    const value = config.get<string>(key);
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

function readTtlSeconds(config: EnvLike): number {
    // `Number(undefined)` and `Number("")` are both handled: NaN falls back, and an
    // empty string would otherwise parse to 0 and mint an already-expired credential.
    const raw = Number(readString(config, ICE_ENV.TURN_TTL_SECONDS));
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_TURN_TTL_SECONDS;
}

export function buildStunServers(config: EnvLike): IceServer[] {
    const configured = splitList(readString(config, ICE_ENV.STUN_URL));
    const urls = configured.length > 0 ? configured : DEFAULT_STUN_URLS;
    return urls.map((url) => ({ urls: url }));
}

/**
 * Mints a coturn REST-API credential (coturn's `use-auth-secret` mode).
 *
 * `username` is `<unix-expiry>:<identity>` and `credential` is the base64 HMAC-SHA1
 * of that username under the shared secret. The secret itself never leaves the
 * server, no static password ships to clients, and every credential expires on its
 * own — so a leaked one is worthless once the TTL passes.
 *
 * `now` is injectable so tests can assert exact output.
 */
export function buildTimeLimitedCredential(
    secret: string,
    identity: string,
    ttlSeconds: number,
    now: Date = new Date(),
): { username: string; credential: string } {
    const username = `${Math.floor(now.getTime() / 1000) + ttlSeconds}:${identity}`;
    return {
        username,
        credential: createHmac("sha1", secret).update(username).digest("base64"),
    };
}

/**
 * TURN entries for the configured URLs.
 *
 * Returns empty when TURN is not configured, and also when it is configured
 * without any usable credential — a relay we cannot authenticate to is worse than
 * no relay, because the client would burn its ICE timeout on it. The caller
 * surfaces that second case as a startup warning.
 */
export function buildTurnServers(
    config: EnvLike,
    identity: string = DEFAULT_TURN_IDENTITY,
): IceServer[] {
    const urls = splitList(readString(config, ICE_ENV.TURN_URL));
    if (urls.length === 0) return [];

    const secret = readString(config, ICE_ENV.TURN_SECRET);
    if (secret) {
        const { username, credential } = buildTimeLimitedCredential(
            secret,
            identity,
            readTtlSeconds(config),
        );
        return urls.map((url) => ({ urls: url, username, credential }));
    }

    const username = readString(config, ICE_ENV.TURN_USERNAME);
    const password = readString(config, ICE_ENV.TURN_PASSWORD);
    if (!username || !password) return [];

    return urls.map((url) => ({ urls: url, username, credential: password }));
}

/** The full `iceServers` array for an `RTCPeerConnection`. */
export function buildIceServers(
    config: EnvLike,
    identity: string = DEFAULT_TURN_IDENTITY,
): IceServer[] {
    return [...buildStunServers(config), ...buildTurnServers(config, identity)];
}
