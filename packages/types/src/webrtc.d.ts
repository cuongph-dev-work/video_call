export interface RTCOffer {
    sdp: string;
    type: 'offer';
}
export interface RTCAnswer {
    sdp: string;
    type: 'answer';
}
export interface ICECandidate {
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
}
export interface MediaConstraints {
    audio: boolean | MediaTrackConstraints;
    video: boolean | MediaTrackConstraints;
}
export interface STUNConfiguration {
    urls: string | string[];
}
export interface TURNConfiguration extends STUNConfiguration {
    username?: string;
    credential?: string;
}
export interface RTCConfig {
    iceServers: (STUNConfiguration | TURNConfiguration)[];
    iceCandidatePoolSize?: number;
}
//# sourceMappingURL=webrtc.d.ts.map