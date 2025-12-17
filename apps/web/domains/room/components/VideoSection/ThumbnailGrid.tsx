import React from 'react';
import { Users } from 'lucide-react';
import { VideoThumbnail } from './VideoThumbnail';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { getGridCols } from '@/shared/lib/responsive';

interface Participant {
    id: string;
    displayName: string;
    stream?: MediaStream;
    audioEnabled: boolean;
    isActiveSpeaker?: boolean;
}

interface ThumbnailGridProps {
    participants: Participant[];
}

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({ participants }) => {
    const { isMobile, isTablet } = useResponsive();
    const cols = getGridCols(participants.length, isMobile, isTablet);

    // Show empty state when no participants
    if (participants.length === 0) {
        return (
            <div className="h-44 shrink-0 flex items-center justify-center bg-[#1a1d29] rounded-xl border border-gray-800/50">
                <div className="text-center px-6 py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600/10 mb-4">
                        <Users className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium">
                        Waiting for others to join...
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                        Share the room code to invite participants
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-44 shrink-0 grid gap-2 sm:gap-4 ${
            isMobile 
                ? 'grid-cols-1' 
                : isTablet 
                ? `grid-cols-${cols}` 
                : `grid-cols-${cols}`
        }`}>
            {participants.map((participant) => (
                <VideoThumbnail
                    key={participant.id}
                    stream={participant.stream}
                    displayName={participant.displayName}
                    audioEnabled={participant.audioEnabled}
                    isActiveSpeaker={participant.isActiveSpeaker}
                />
            ))}
        </div>
    );
};
