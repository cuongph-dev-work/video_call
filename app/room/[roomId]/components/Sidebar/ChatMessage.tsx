import React from 'react';
import Image from 'next/image';

interface ChatMessageProps {
    message: {
        id: string;
        senderId: string;
        senderName: string;
        senderAvatar?: string;
        content: string;
        timestamp: string;
    };
    showAvatar?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
    message,
    showAvatar = true,
}) => {
    return (
        <div className="flex gap-3 group items-start">
            {showAvatar ? (
                message.senderAvatar ? (
                    <Image
                        src={message.senderAvatar}
                        alt={message.senderName}
                        width={32}
                        height={32}
                        className="rounded-full object-cover shrink-0"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {message.senderName.charAt(0).toUpperCase()}
                    </div>
                )
            ) : (
                <div className="w-8 shrink-0" />
            )}

            <div className="flex flex-col gap-1 w-full">
                {showAvatar && (
                    <div className="flex items-baseline justify-between w-full">
                        <span className="text-[11px] font-bold text-gray-400">
                            {message.senderName}
                        </span>
                        <span className="text-[9px] text-gray-500">{message.timestamp}</span>
                    </div>
                )}
                <div className="bg-[#2c303f] p-2.5 rounded-xl rounded-tl-none text-xs text-gray-200 leading-relaxed border border-white/5">
                    {message.content}
                </div>
            </div>
        </div>
    );
};
