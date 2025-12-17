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
    return (
        <div className="flex-1 flex flex-col gap-4 min-w-0">
            <MainVideo
                stream={mainSpeaker.stream}
                displayName={mainSpeaker.displayName}
                recordingTime={recordingTime}
                isRecording={isRecording}
                onFullscreen={onFullscreen}
            />

            <ThumbnailGrid participants={participants} />
        </div>
    );
};
