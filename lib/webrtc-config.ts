// WebRTC Configuration

export const rtcConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: process.env.NEXT_PUBLIC_STUN_SERVER || 'stun:stun.l.google.com:19302',
    },
    // Add TURN servers for production
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'username',
    //   credential: 'password'
    // }
  ],
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
  video: {
    cursor: 'always' as const,
  },
  audio: false,
};
