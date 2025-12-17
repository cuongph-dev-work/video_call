// Meeting Types

export interface Participant {
  id: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isHost: boolean;
  isScreenSharing?: boolean;
  joinedAt: Date;
}

export interface RoomSettings {
  requirePassword: boolean;
  password?: string;
  allowChat: boolean;
  allowScreenShare: boolean;
  allowMicrophone: boolean;
  allowCamera: boolean;
  maxParticipants?: number;
}

export interface Meeting {
  id: string;
  code: string;
  title: string;
  hostId: string;
  hostName?: string;
  settings: RoomSettings;
  participants: Participant[];
  isActive: boolean;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
}

export interface CreateMeetingDto {
  title?: string;
  settings?: Partial<RoomSettings>;
}

export interface JoinRoomDto {
  roomId: string;
  displayName: string;
  password?: string;
}

export interface UpdateSettingsDto {
  requirePassword?: boolean;
  password?: string;
  allowChat?: boolean;
  allowScreenShare?: boolean;
  allowMicrophone?: boolean;
  allowCamera?: boolean;
}
