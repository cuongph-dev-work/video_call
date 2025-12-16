import React, { useRef, useEffect } from 'react';
import { Maximize, Radio } from 'lucide-react';

interface MainVideoProps {
    stream?: MediaStream;
    displayName: string;
    recordingTime?: string;
    isRecording?: boolean;
    onFullscreen?: () => void;
}

export const MainVideo: React.FC<MainVideoProps> = ({
    stream,
    displayName,
    recordingTime,
    isRecording = false,
    onFullscreen,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="flex-1 relative bg-white/5 rounded-3xl overflow-hidden shadow-2xl group">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Recording indicator */}
            {isRecording && recordingTime && (
                <div className="absolute top-6 left-6 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    </div>
                    <span className="text-sm font-medium text-white tracking-wide">
                        {recordingTime}
                    </span>
                </div>
            )}

            {/* Fullscreen button */}
            {onFullscreen && (
                <div className="absolute top-6 right-6">
                    <button
                        onClick={onFullscreen}
                        className="w-10 h-10 bg-black/30 backdrop-blur-md hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors"
                        aria-label="Fullscreen"
                    >
                        <Maximize className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Speaker name */}
            <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl">
                <span className="font-medium text-white text-lg">{displayName}</span>
            </div>

            {/* Audio indicator */}
            <div className="absolute bottom-6 right-6">
                <div className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                    <Radio className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
};
