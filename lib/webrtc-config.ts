// WebRTC Configuration
import { ICE_SERVERS_DEV, ICE_SERVERS_PROD } from '@video-call/types';

const getIceServers = (): RTCIceServer[] => {
  // Use production servers if in production, otherwise use dev servers
  const baseServers = process.env.NODE_ENV === 'production' 
    ? ICE_SERVERS_PROD 
    : ICE_SERVERS_DEV;

  const servers: RTCIceServer[] = [...baseServers];

  // Add TURN server if configured
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnPassword = process.env.NEXT_PUBLIC_TURN_PASSWORD;

  if (turnUrl && turnUsername && turnPassword) {
    servers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnPassword,
    });
  }

  return servers;
};

export const rtcConfig: RTCConfiguration = {
  iceServers: getIceServers(),
  iceCandidatePoolSize: 10,
};

export const mediaConstraints: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  },
};

export const screenShareConstraints: DisplayMediaStreamOptions = {
  video: true,
  audio: false,
};
