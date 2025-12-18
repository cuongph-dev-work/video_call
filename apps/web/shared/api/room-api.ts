import { MeetingConfig } from "@/domains/room/components/CreateMeetingModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface RoomPermissions {
  allowChat: boolean;
  allowScreenShare: boolean;
  allowMicrophone: boolean;
  allowCamera: boolean;
}

export interface RoomSettings {
  requirePassword: boolean;
  lockRoom: boolean;
  roomName?: string;
  permissions: RoomPermissions;
}

export const roomApi = {
  createRoom: async (config: MeetingConfig) => {
    const response = await fetch(`${API_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.name,
        hostId: config.hostId,
        scheduledTime: config.scheduledTime,
        permissions: {
          allowJoinBeforeHost: config.allowJoinBeforeHost,
          allowCamera: config.allowCamera,
          allowMicrophone: config.allowMicrophone,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    return response.json();
  },

  getSettings: async (roomId: string): Promise<{ success: boolean; settings: RoomSettings }> => {
    const response = await fetch(`${API_URL}/rooms/${roomId}/settings`);
    if (!response.ok) {
      // Return default permissions if settings not found
      return {
        success: true,
        settings: {
          requirePassword: false,
          lockRoom: false,
          permissions: {
            allowChat: true,
            allowScreenShare: true,
            allowMicrophone: true,
            allowCamera: true,
          },
        },
      };
    }
    return response.json();
  },

  checkAccess: async (roomId: string) => {
    const response = await fetch(`${API_URL}/rooms/${roomId}/check-access`);
    if (!response.ok) {
      throw new Error('Failed to check room access');
    }
    return response.json() as Promise<{
      success: boolean;
      isLocked: boolean;
      requiresPassword: boolean;
      waitingRoomEnabled: boolean;
    }>;
  },

  checkRoomHost: async (roomId: string, userId: string) => {
    const response = await fetch(`${API_URL}/rooms/${roomId}/host`);
    if (!response.ok) {
      return { isHost: false };
    }
    const data = await response.json() as { success: boolean; hostId: string };
    return { isHost: data.hostId === userId };
  },

  validatePassword: async (roomId: string, password: string) => {
    const response = await fetch(`${API_URL}/rooms/${roomId}/validate-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.success;
  },
};

