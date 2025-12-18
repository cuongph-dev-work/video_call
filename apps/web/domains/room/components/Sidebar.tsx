import React from 'react';
import { ParticipantsPanel } from '@/domains/participant/components/ParticipantsPanel';
import { ChatPanel } from '@/domains/chat/components/ChatPanel';
import { useResponsive } from '@/shared/hooks/useResponsive';

import { Participant, Message } from '@/domains/room/types';

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
    const { isMobile } = useResponsive();

    if (isMobile) {
        // Mobile: Hidden by default, can be toggled
        return null;
    }

    return (
        <aside className="w-full sm:w-80 lg:w-[22rem] bg-[#1c1f2e] rounded-xl lg:rounded-3xl flex flex-col border border-white/5 shadow-2xl overflow-hidden shrink-0">
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
