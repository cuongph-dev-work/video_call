// WebRTC Types

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

// WebRTC ICE Servers Configuration
export const ICE_SERVERS_DEV: RTCIceServer[] = [
  // Google STUN - FREE FOREVER
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  
  // Backup
  { urls: 'stun:stunserver.stunprotocol.org:3478' }
];

export const ICE_SERVERS_PROD: RTCIceServer[] = [
  // Open Relay FREE 20GB
  { urls: 'stun:openrelay.metered.ca:80' },
  
  // Google fallback
  { urls: 'stun:stun.l.google.com:19302' }
];
