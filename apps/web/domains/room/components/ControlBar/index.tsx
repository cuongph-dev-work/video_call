'use client';

import React from 'react';
import {
    Mic,
    MicOff,
    Video as VideoIcon,
    VideoOff,
    MonitorUp,
    MessageSquare,
    MoreHorizontal,
    PhoneOff
} from 'lucide-react';
import { ControlButton } from './ControlButton';
import { useChatStore } from '@/domains/chat/stores/useChatStore';
import type { RoomPermissions } from '@/shared/api/room-api';

interface ControlBarProps {
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenSharing: boolean;
    recording?: boolean;
    isHost?: boolean;
    permissions?: RoomPermissions;
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
    isHost = false,
    permissions,
    onToggleAudio,
    onToggleVideo,
    onToggleScreenShare,
    onToggleChat,
    onMoreOptions,
    onEndCall,
}) => {
    const unreadCount = useChatStore(state => state.unreadCount);

    // Check if actions are allowed (host always allowed, or check permission)
    const canToggleAudio = isHost || permissions?.allowMicrophone !== false;
    const canToggleVideo = isHost || permissions?.allowCamera !== false;
    const canToggleScreenShare = isHost || permissions?.allowScreenShare !== false;

    const handleToggleAudio = () => {
        if (!canToggleAudio) {
            alert('Microphone is disabled by the host');
            return;
        }
        onToggleAudio();
    };

    const handleToggleVideo = () => {
        if (!canToggleVideo) {
            alert('Camera is disabled by the host');
            return;
        }
        onToggleVideo();
    };

    const handleToggleScreenShare = () => {
        if (!canToggleScreenShare) {
            alert('Screen sharing is disabled by the host');
            return;
        }
        onToggleScreenShare();
    };

    return (
        <div className="h-16 sm:h-20 flex items-center justify-center shrink-0 z-20 relative mt-2 bg-[#13161f] rounded-xl sm:rounded-2xl px-2 sm:px-0">
            <div className="flex items-center gap-2 sm:gap-4 md:gap-6 flex-wrap justify-center">
                <ControlButton
                    icon={audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                    variant={!canToggleAudio ? "disabled" : audioEnabled ? "primary" : "danger"}
                    active={audioEnabled}
                    onClick={handleToggleAudio}
                    disabled={!canToggleAudio}
                    title={!canToggleAudio ? "Microphone disabled by host" : undefined}
                />

                <ControlButton
                    icon={videoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                    variant={!canToggleVideo ? "disabled" : videoEnabled ? "primary" : "danger"}
                    active={videoEnabled}
                    onClick={handleToggleVideo}
                    disabled={!canToggleVideo}
                    title={!canToggleVideo ? "Camera disabled by host" : undefined}
                />

                <ControlButton
                    icon={<MonitorUp className="w-5 h-5" />}
                    variant={!canToggleScreenShare ? "disabled" : undefined}
                    active={screenSharing}
                    onClick={handleToggleScreenShare}
                    disabled={!canToggleScreenShare}
                    title={!canToggleScreenShare ? "Screen sharing disabled by host" : undefined}
                />

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

