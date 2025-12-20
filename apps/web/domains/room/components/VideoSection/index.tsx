import React from 'react';
import { MainVideo } from './MainVideo';
import { ThumbnailGrid } from './ThumbnailGrid';

interface Participant {
    id: string;
    displayName: string;
    stream?: MediaStream;
    audioEnabled: boolean;
    isActiveSpeaker?: boolean;
}

interface VideoSectionProps {
    mainSpeaker: {
        stream?: MediaStream;
        displayName: string;
        audioEnabled?: boolean;
    };
    participants: Participant[];
    recordingTime?: string;
    isRecording?: boolean;
    onFullscreen?: () => void;
}

export const VideoSection: React.FC<VideoSectionProps> = ({
    mainSpeaker,
    participants,
    recordingTime,
    isRecording,
    onFullscreen,
}) => {
    const hasParticipants = participants.length > 0;

    return (
        <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0">
            {/* Main Video - Takes remaining space */}
            <div className="flex-1 min-w-0 min-h-0">
                <MainVideo
                    stream={mainSpeaker.stream}
                    displayName={mainSpeaker.displayName}
                    audioEnabled={mainSpeaker.audioEnabled}
                    recordingTime={recordingTime}
                    isRecording={isRecording}
                    onFullscreen={onFullscreen}
                />
            </div>

            {/* Participants Grid - Below main video */}
            {hasParticipants && (
                <div className="shrink-0">
                    <ThumbnailGrid participants={participants} />
                </div>
            )}
        </div>
    );
};
