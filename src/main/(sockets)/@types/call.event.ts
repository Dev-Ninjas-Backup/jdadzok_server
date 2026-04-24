import { BaseSocketEvent } from "./base.types";

// Call Events
export interface CallEvent extends BaseSocketEvent {
    callId: string;
    callType: "audio" | "video";
    action: "initiate" | "accept" | "decline" | "end" | "join" | "leave";
    participants: string[];
    sdpOffer?: string;
    sdpAnswer?: string;
    iceCandidate?: RTCIceCandidate;
}
