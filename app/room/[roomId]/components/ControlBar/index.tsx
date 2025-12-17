'use client';

import React from 'react';
import {
    Mic,
    MicOff,
    Video as VideoIcon,
    VideoOff,
    MonitorUp,
    Radio,
    MessageSquare,
    MoreHorizontal,
    PhoneOff
} from 'lucide-react';
import { ControlButton } from './ControlButton';
import { useChatStore } from '@/store/useChatStore';

interface ControlBarProps {
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenSharing: boolean;
    recording?: boolean;
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    onToggleScreenShare: () => void;
    onToggleRecording?: () => void;
    onToggleChat?: () => void;
    onMoreOptions?: () => void;
    onEndCall: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
    audioEnabled,
    videoEnabled,
    screenSharing,
    recording = false,
    onToggleAudio,
    onToggleVideo,
    onToggleScreenShare,
    onToggleRecording,
    onToggleChat,
    onMoreOptions,
    onEndCall,
}) => {
    const unreadCount = useChatStore(state => state.unreadCount);

    return (
        <div className="h-16 sm:h-20 flex items-center justify-center shrink-0 z-20 relative mt-2 bg-[#13161f] rounded-xl sm:rounded-2xl px-2 sm:px-0">
            <div className="flex items-center gap-2 sm:gap-4 md:gap-6 flex-wrap justify-center">
                <ControlButton
                    icon={audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    variant={audioEnabled ? "primary" : "danger"}
                    active={audioEnabled}
                    onClick={onToggleAudio}
                />

                <ControlButton
                    icon={videoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    variant={videoEnabled ? "primary" : "danger"}
                    active={videoEnabled}
                    onClick={onToggleVideo}
                />

                <ControlButton
                    icon={<MonitorUp className="w-5 h-5" />}
                    active={screenSharing}
                    onClick={onToggleScreenShare}
                />

                {onToggleRecording && (
                    <ControlButton
                        icon={
                            <span className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                            </span>
                        }
                        active={recording}
                        badge={recording}
                        onClick={onToggleRecording}
                    />
                )}

                {onToggleChat && (
                    <ControlButton
                        icon={<MessageSquare className="w-5 h-5" />}
                        onClick={onToggleChat}
                        badge={unreadCount}
                    />
                )}

                {onMoreOptions && (
                    <ControlButton
                        icon={<MoreHorizontal className="w-5 h-5" />}
                        onClick={onMoreOptions}
                    />
                )}

                <ControlButton
                    icon={<PhoneOff className="w-5 h-5" />}
                    variant="danger"
                    label="End Call"
                    onClick={onEndCall}
                />
            </div>
        </div>
    );
};
