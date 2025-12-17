import { MeetingConfig } from "@/domains/room/components/CreateMeetingModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const roomApi = {
  createRoom: async (config: MeetingConfig) => {
    const response = await fetch(`${API_URL}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.name,
        hostId: config.hostId, // Added hostId here
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

    return response.json(); // returns { success: true, roomId: '...', settings: ... }
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
};
