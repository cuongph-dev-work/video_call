import React, { useRef, useEffect, useState } from 'react';
import { Maximize, Mic, MicOff, VideoOff } from 'lucide-react';

interface MainVideoProps {
    stream?: MediaStream;
    displayName?: string;
    recordingTime?: string;
    isRecording?: boolean;
    audioEnabled?: boolean;
    onFullscreen?: () => void;
}

export const MainVideo: React.FC<MainVideoProps> = ({
    stream,
    displayName,
    recordingTime,
    isRecording = false,
    audioEnabled = true,
    onFullscreen,
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasVideoTrack, setHasVideoTrack] = useState(true);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // Monitor video track state using proper events
    useEffect(() => {
        if (!stream) {
            setHasVideoTrack(false);
            return;
        }

        const videoTrack = stream.getVideoTracks()[0];

        if (!videoTrack) {
            setHasVideoTrack(false);
            return;
        }

        // Set initial state immediately
        const updateTrackState = () => {
            const hasVideo = videoTrack.enabled && !videoTrack.muted;
            setHasVideoTrack(hasVideo);
        };

        updateTrackState(); // Initial check

        // Listen for track events
        const handleMute = () => {
            console.log('Video track muted');
            setHasVideoTrack(false);
        };

        const handleUnmute = () => {
            console.log('Video track unmuted');
            updateTrackState();
        };

        const handleEnded = () => {
            console.log('Video track ended');
            setHasVideoTrack(false);
        };

        videoTrack.addEventListener('mute', handleMute);
        videoTrack.addEventListener('unmute', handleUnmute);
        videoTrack.addEventListener('ended', handleEnded);

        // Poll for enabled state changes (since enabled doesn't fire events)
        const checkEnabled = () => {
            updateTrackState();
        };
        const interval = setInterval(checkEnabled, 200); // Check every 200ms

        return () => {
            videoTrack.removeEventListener('mute', handleMute);
            videoTrack.removeEventListener('unmute', handleUnmute);
            videoTrack.removeEventListener('ended', handleEnded);
            clearInterval(interval);
        };
    }, [stream]);

    return (
        <div className="relative bg-white/5 rounded-3xl overflow-hidden shadow-2xl group h-full w-full">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${!hasVideoTrack ? 'opacity-0' : 'opacity-100'}`}
            />

            {/* Video off placeholder */}
            {!hasVideoTrack && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4">
                        <VideoOff className="w-12 h-12 text-white/60" />
                    </div>
                    {displayName && (
                        <p className="text-lg font-medium text-white/80">{displayName}</p>
                    )}
                    <p className="text-sm text-white/50 mt-2">Camera is off</p>
                </div>
            )}

            {/* Recording indicator */}
            {/* {isRecording && recordingTime && (
                <div className="absolute top-6 left-6 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 z-10">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    </div>
                    <span className="text-sm font-medium text-white tracking-wide">
                        {recordingTime}
                    </span>
                </div>
            )} */}

            {/* Fullscreen button */}
            {onFullscreen && (
                <div className="absolute top-6 right-6 z-10">
                    <button
                        onClick={onFullscreen}
                        className="w-10 h-10 bg-black/30 backdrop-blur-md hover:bg-black/50 rounded-full flex items-center justify-center text-white transition-colors"
                        aria-label="Fullscreen"
                    >
                        <Maximize className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
};
