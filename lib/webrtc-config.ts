// WebRTC Configuration

const getIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [
    {
      urls: process.env.NEXT_PUBLIC_STUN_SERVER || 'stun:stun.l.google.com:19302',
    },
  ];

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
