'use client';

import { VideoTile } from './VideoTile';

interface VideoGridProps {
    localStream: MediaStream | null;
    localDisplayName: string;
    localAudioEnabled: boolean;
    localVideoEnabled: boolean;
    remoteStreams: Array<{
        id: string;
        stream: MediaStream;
        displayName: string;
        audioEnabled?: boolean;
        videoEnabled?: boolean;
    }>;
    activeSpeakerId?: string | null;
}

export function VideoGrid({
    localStream,
    localDisplayName,
    localAudioEnabled,
    localVideoEnabled,
    remoteStreams,
    activeSpeakerId,
}: VideoGridProps) {
    const totalParticipants = remoteStreams.length + 1; // +1 for local user

    // Determine grid layout based on participant count
    const getGridClass = () => {
        if (totalParticipants === 1) return 'grid-cols-1';
        if (totalParticipants === 2) return 'grid-cols-1 md:grid-cols-2';
        if (totalParticipants <= 4) return 'grid-cols-2';
        if (totalParticipants <= 6) return 'grid-cols-2 md:grid-cols-3';
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    };

    const isActiveSpeaker = (userId: string) => {
        return activeSpeakerId === userId;
    };

    return (
        <div className={`grid gap-4 h-full ${getGridClass()}`}>
            {/* Local Video */}
            <VideoTile
                stream={localStream}
                displayName={localDisplayName}
                isMuted={!localAudioEnabled}
                isVideoOff={!localVideoEnabled}
                isLocal={true}
                className={`${isActiveSpeaker('local') ? 'ring-4 ring-blue-500' : ''}`}
            />

            {/* Remote Videos */}
            {remoteStreams.map(({ id, stream, displayName, audioEnabled, videoEnabled }) => (
                <VideoTile
                    key={id}
                    stream={stream}
                    displayName={displayName}
                    isMuted={!(audioEnabled ?? true)}
                    isVideoOff={!(videoEnabled ?? true)}
                    isLocal={false}
                    className={`${isActiveSpeaker(id) ? 'ring-4 ring-blue-500' : ''}`}
                />
            ))}
        </div>
    );
}
