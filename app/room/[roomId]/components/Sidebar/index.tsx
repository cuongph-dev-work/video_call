import React from 'react';
import { ParticipantsPanel } from './ParticipantsPanel';
import { ChatPanel } from './ChatPanel';

interface Participant {
    id: string;
    displayName: string;
    avatar?: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
}

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    timestamp: string;
}

interface SidebarProps {
    participants: Participant[];
    messages: Message[];
    onAddParticipant?: () => void;
    onSendMessage: (content: string) => void;
    onAttachFile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    participants,
    messages,
    onAddParticipant,
    onSendMessage,
    onAttachFile,
}) => {
    return (
        <aside className="w-[22rem] bg-[#1c1f2e] rounded-3xl flex flex-col border border-white/5 shadow-2xl overflow-hidden shrink-0">
            <ParticipantsPanel
                participants={participants}
                onAddParticipant={onAddParticipant}
            />

            <div className="h-px bg-white/10 mx-5 my-2" />

            <ChatPanel
                messages={messages}
                onSendMessage={onSendMessage}
                onAttachFile={onAttachFile}
            />
        </aside>
    );
};
