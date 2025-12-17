export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    type: 'text' | 'file';
    fileUrl?: string;
    fileName?: string;
    isPrivate: boolean;
    recipientId?: string;
    timestamp: Date;
}
export interface SendMessageDto {
    content: string;
    isPrivate: boolean;
    recipientId?: string;
}
//# sourceMappingURL=chat.d.ts.map