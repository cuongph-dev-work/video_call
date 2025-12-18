
export interface Participant {
    id: string;
    displayName: string;
    avatar?: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
    isScreenSharing?: boolean;
}

export interface Message {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    timestamp: string;
}
