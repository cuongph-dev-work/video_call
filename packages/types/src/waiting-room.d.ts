export interface WaitingUser {
    id: string;
    displayName: string;
    joinedAt: Date;
    avatar?: string;
}
export interface WaitingRoomState {
    enabled: boolean;
    waitingUsers: WaitingUser[];
}
export interface AdmitUserPayload {
    roomId: string;
    userId: string;
}
export interface RejectUserPayload {
    roomId: string;
    userId: string;
    reason?: string;
}
export interface WaitingRoomResponse {
    success: boolean;
    message?: string;
    waitingUsers?: WaitingUser[];
}
//# sourceMappingURL=waiting-room.d.ts.map