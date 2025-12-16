import React, { useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VideoThumbnailProps {
    stream?: MediaStream;
    displayName: string;
    audioEnabled: boolean;
    isActiveSpeaker?: boolean;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
    stream,
    displayName,
    audioEnabled,
    isActiveSpeaker = false,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div
            className={`relative bg-[#1c1f2e] rounded-2xl overflow-hidden group ${isActiveSpeaker
                    ? 'border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                    : 'border border-white/5'
                }`}
        >
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Name badge */}
            <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg">
                <p className="font-medium text-sm text-white">{displayName}</p>
            </div>

            {/* Mic status */}
            <div
                className={`absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-white shadow-sm ${audioEnabled ? 'bg-blue-600' : 'bg-red-500'
                    }`}
            >
                {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </div>

            {/* Audio level indicator for active speaker */}
            {isActiveSpeaker && audioEnabled && (
                <div className="absolute bottom-0 left-10 right-10 h-1 bg-white/20 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-blue-500 w-2/3 mx-auto rounded-full" />
                </div>
            )}
        </div>
    );
};
