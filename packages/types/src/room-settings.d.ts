export interface DetailedRoomSettings {
    password?: string;
    requirePassword: boolean;
    lockRoom: boolean;
    roomName?: string;
    description?: string;
    permissions: {
        allowChat: boolean;
        allowScreenShare: boolean;
        allowMicrophone: boolean;
        allowCamera: boolean;
    };
    maxParticipants?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface UpdateRoomSettingsPayload {
    password?: string;
    requirePassword?: boolean;
    lockRoom?: boolean;
    roomName?: string;
    description?: string;
    permissions?: Partial<DetailedRoomSettings['permissions']>;
    maxParticipants?: number;
}
export interface ValidatePasswordPayload {
    roomId: string;
    password: string;
}
export interface RoomSettingsResponse {
    success: boolean;
    settings?: Omit<DetailedRoomSettings, 'password'>;
    message?: string;
}
//# sourceMappingURL=room-settings.d.ts.map