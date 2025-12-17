'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, ChevronUp, ChevronDown } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useChatStore } from '@/store/useChatStore';

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    timestamp: string;
}

interface ChatPanelProps {
    messages: Message[];
    onSendMessage: (content: string) => void;
    onAttachFile?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    onSendMessage,
    onAttachFile,
}) => {
    const [activeTab, setActiveTab] = useState<'group' | 'personal'>('group');
    const [inputValue, setInputValue] = useState('');
    const [collapsed, setCollapsed] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const markAsRead = useChatStore(state => state.markAsRead);

    // Mark messages as read when chat panel is visible
    useEffect(() => {
        markAsRead();
    }, [markAsRead]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = () => {
        if (inputValue.trim()) {
            onSendMessage(inputValue);
            setInputValue('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Group consecutive messages from same sender
    const groupedMessages = messages.reduce<Array<{ messages: Message[], showAvatar: boolean }>>((acc, message, index) => {
        const prevMessage = messages[index - 1];
        const isNewGroup = !prevMessage || prevMessage.senderId !== message.senderId;

        if (isNewGroup) {
            acc.push({ messages: [message], showAvatar: true });
        } else {
            const lastGroup = acc[acc.length - 1];
            lastGroup.messages.push(message);
        }

        return acc;
    }, []);

    return (
        <div className="px-5 pt-2 pb-4 flex flex-col flex-1">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Chats</h3>
                <div className="flex items-center gap-2">
                    <div className="flex bg-[#2c303f] rounded-lg p-0.5">
                        <button
                            onClick={() => setActiveTab('group')}
                            className={`px-4 py-1 rounded-md text-xs font-medium transition-all ${activeTab === 'group'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Group
                        </button>
                        <button
                            onClick={() => setActiveTab('personal')}
                            className={`px-4 py-1 rounded-md text-xs font-medium transition-all ${activeTab === 'personal'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Personal
                        </button>
                    </div>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label={collapsed ? 'Expand' : 'Collapse'}
                    >
                        {collapsed ? (
                            <ChevronDown className="w-5 h-5" />
                        ) : (
                            <ChevronUp className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>

            {!collapsed && (
                <>
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto space-y-5 pr-1 mb-4"
                        style={{ maxHeight: '300px' }}
                    >
                        {groupedMessages.map((group, groupIndex) => (
                            <div key={groupIndex} className="space-y-1">
                                {group.messages.map((message, messageIndex) => (
                                    <ChatMessage
                                        key={message.id}
                                        message={message}
                                        showAvatar={messageIndex === 0}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>

                    <div className="p-4 bg-[#13161f]/50 rounded-xl mt-auto">
                        <div className="relative flex items-center gap-2">
                            {onAttachFile && (
                                <button
                                    onClick={onAttachFile}
                                    className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                                    aria-label="Attach file"
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>
                            )}

                            <div className="flex-1 relative">
                                <input
                                    className="w-full bg-[#2c303f] text-white text-xs rounded-xl py-3 pl-4 pr-4 border border-transparent focus:border-blue-500 focus:ring-0 focus:outline-none placeholder-gray-500"
                                    placeholder="Type Something..."
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                />
                            </div>

                            <button
                                onClick={handleSend}
                                disabled={!inputValue.trim()}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white w-10 h-10 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center"
                                aria-label="Send message"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
