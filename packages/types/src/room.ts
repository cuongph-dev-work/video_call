// Room Types

/**
 * Options for joining a room
 * Extensible interface for future features
 */
export interface JoinRoomOptions {
  displayName: string;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  password?: string;
  
  // Future extensibility examples:
  // avatar?: string;
  // preferredQuality?: 'auto' | '360p' | '720p' | '1080p';
  // enableNoiseSuppression?: boolean;
  // enableEchoCancellation?: boolean;
  // preferredCodec?: 'vp8' | 'vp9' | 'h264';
}

/**
 * Participant information in a room
 */
export interface RoomParticipantInfo {
  id: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isHost: boolean;
  joinedAt: number;
  avatar?: string;
}
