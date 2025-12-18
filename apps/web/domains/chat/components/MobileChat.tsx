'use client';

import React from 'react';
import { X } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { Message } from '@/domains/room/types';

interface MobileChatProps {
    isOpen: boolean;
    onClose: () => void;
    messages: Message[];
    onSendMessage: (content: string) => void;
}

export const MobileChat: React.FC<MobileChatProps> = ({
    isOpen,
    onClose,
    messages,
    onSendMessage,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-40 bg-[#0f1115] flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#13161f]">
                <h2 className="text-white font-semibold flex items-center gap-2">
                    Chat
                    <span className="text-xs font-normal text-gray-400 bg-white/10 px-2 py-0.5 rounded-full">
                        {messages.length}
                    </span>
                </h2>
                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Chat Panel */}
            <div className="flex-1 flex flex-col min-h-0">
                <ChatPanel
                    messages={messages}
                    onSendMessage={onSendMessage}
                />
            </div>
        </div>
    );
};
