import React from 'react';
import { Video, MoreVertical, Settings } from 'lucide-react';
import Image from 'next/image';
import { MeetingInfo } from './MeetingInfo';
import { ParticipantStack } from './ParticipantStack';
import { RoomCodeBadge } from './RoomCodeBadge';

interface RoomHeaderProps {
    meetingTitle: string;
    meetingDate: string;
    meetingTime: string;
    roomCode: string;
    participants: Array<{
        id: string;
        displayName: string;
        avatar?: string;
    }>;
    currentUser: {
        displayName: string;
        avatar?: string;
        role?: string;
    };
    onMoreOptions?: () => void;
    onOpenSettings?: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
    meetingTitle,
    meetingDate,
    meetingTime,
    roomCode,
    participants,
    currentUser,
    onMoreOptions,
    onOpenSettings,
}) => {
    return (
        <header className="h-20 flex items-center justify-between px-6 bg-[#13161f] shrink-0 z-10">
            <div className="flex items-center gap-4">
                <div className="bg-blue-600 rounded-xl p-2 flex items-center justify-center w-10 h-10 shadow-lg shadow-blue-500/20">
                    <Video className="w-6 h-6 text-white" />
                </div>
                <MeetingInfo title={meetingTitle} date={meetingDate} time={meetingTime} />
            </div>

            <div className="flex items-center gap-6">
                <ParticipantStack participants={participants} />

                <RoomCodeBadge roomCode={roomCode} />

                <div className="flex items-center gap-3 bg-[#1c1f2e] px-2 py-1.5 rounded-full border border-white/5">
                    {currentUser.avatar ? (
                        <Image
                            src={currentUser.avatar}
                            alt={currentUser.displayName}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {currentUser.displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="hidden lg:block pr-2">
                        <p className="text-sm font-medium text-white leading-tight">
                            {currentUser.displayName}
                        </p>
                        {currentUser.role && (
                            <p className="text-[10px] text-gray-400 leading-tight">
                                {currentUser.role}
                            </p>
                        )}
                    </div>
                </div>

                {onOpenSettings && (
                    <button
                        onClick={onOpenSettings}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-[#1c1f2e] rounded-lg"
                        aria-label="Room settings"
                        title="Room settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                )}

                {onMoreOptions && (
                    <button
                        onClick={onMoreOptions}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="More options"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>
                )}
            </div>
        </header>
    );
};
