import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { buildIceServers, IceServer } from "./ice.builder";
import { DEFAULT_TURN_IDENTITY, ICE_ENV } from "./ice.constants";

/**
 * Serves the ICE configuration the app hands to `RTCPeerConnection`.
 *
 * The app already honours whatever this advertises and only falls back to a bare
 * STUN list when the array comes back empty, so this service is the single switch
 * that moves calls off STUN-only. Wiring it into the call-room response is what
 * Issue #40 asked for.
 */
@Injectable()
export class IceService {
    private readonly logger = new Logger(IceService.name);

    constructor(private readonly config: ConfigService) {
        // Warned about here, at boot, rather than on the first affected call: the
        // symptom (calls that work on Wi-Fi and hang on cellular) points nowhere near
        // the configuration, so it is worth saying once, loudly, up front.
        if (this.hasTurnUrl() && !this.hasTurnCredential()) {
            this.logger.warn(
                `${ICE_ENV.TURN_URL} is set but no TURN credential is configured ` +
                    `(${ICE_ENV.TURN_SECRET}, or ${ICE_ENV.TURN_USERNAME} + ${ICE_ENV.TURN_PASSWORD}) ` +
                    "— TURN is disabled and calls stay STUN-only, so they will still fail across NATs",
            );
        }
    }

    /**
     * @param identity who the credential is minted for. coturn ignores the value but
     *   records it, so the caller's userId makes relay usage traceable per user.
     */
    getIceServers(identity: string = DEFAULT_TURN_IDENTITY): IceServer[] {
        return buildIceServers(this.config, identity);
    }

    private hasTurnUrl(): boolean {
        return !!this.config.get<string>(ICE_ENV.TURN_URL)?.trim();
    }

    private hasTurnCredential(): boolean {
        const secret = !!this.config.get<string>(ICE_ENV.TURN_SECRET)?.trim();
        const pair =
            !!this.config.get<string>(ICE_ENV.TURN_USERNAME)?.trim() &&
            !!this.config.get<string>(ICE_ENV.TURN_PASSWORD)?.trim();
        return secret || pair;
    }
}
