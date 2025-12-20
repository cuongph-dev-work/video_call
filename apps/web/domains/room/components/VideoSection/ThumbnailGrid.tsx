import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { VideoThumbnail } from './VideoThumbnail';

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

/**
 * Get adaptive grid classes for horizontal layout
 * Thumbnails have max-width to prevent stretching
 */
const getGridConfig = (count: number) => {
    // Max width for thumbnails based on count
    if (count === 1) {
        return { maxWidth: '240px', minCols: 1 };
    }
    if (count === 2) {
        return { maxWidth: '280px', minCols: 2 };
    }
    if (count <= 4) {
        return { maxWidth: '220px', minCols: 2 };
    }
    if (count <= 6) {
        return { maxWidth: '200px', minCols: 3 };
    }
    // 7-9 participants
    return { maxWidth: '180px', minCols: 3 };
};

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({ participants }) => {
    const config = useMemo(() => getGridConfig(participants.length), [participants.length]);

    // Show empty state when no participants
    if (participants.length === 0) {
        return (
            <div className="h-32 shrink-0 flex items-center justify-center bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-2xl border border-gray-700/30 backdrop-blur-sm">
                <div className="text-center px-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 backdrop-blur-sm mb-3">
                        <Users className="w-6 h-6 text-blue-400" />
                    </div>
                    <p className="text-gray-300 text-sm font-medium">
                        Đang chờ người khác tham gia...
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                        Chia sẻ mã phòng để mời người tham gia
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-44 flex gap-2">
            {participants.map((participant) => (
                <div key={participant.id} className="w-60 h-full shrink-0">
                    <VideoThumbnail
                        stream={participant.stream}
                        displayName={participant.displayName}
                        audioEnabled={participant.audioEnabled}
                        isActiveSpeaker={participant.isActiveSpeaker}
                    />
                </div>
            ))}

            {/* Empty placeholder filling remaining space */}
            {participants.length > 0 && participants.length < 9 && (
                <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-800/20 to-slate-900/20 rounded-2xl border border-gray-700/20 backdrop-blur-sm min-w-[200px]">
                    <div className="text-center px-4">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500/10 mb-2">
                            <Users className="w-5 h-5 text-blue-400/60" />
                        </div>
                        <p className="text-gray-400 text-xs font-medium">
                            Đang chờ người khác...
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
