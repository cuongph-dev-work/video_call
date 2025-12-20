import React, { useRef, useEffect, useState } from 'react';
import { Mic, MicOff, VideoOff } from 'lucide-react';

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
    const [hasVideoTrack, setHasVideoTrack] = useState(true);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;

            // Force track state check when video metadata loaded
            const handleLoadedMetadata = () => {
                console.log('🎬 Thumbnail video metadata loaded for:', displayName);
                // Trigger re-check after a small delay
                setTimeout(() => {
                    const videoTrack = stream.getVideoTracks()[0];
                    if (videoTrack) {
                        const hasVideo = videoTrack.enabled && !videoTrack.muted;
                        console.log(`🎬 [${displayName}] Thumbnail post-load track state:`, {
                            enabled: videoTrack.enabled,
                            muted: videoTrack.muted,
                            readyState: videoTrack.readyState,
                            hasVideo
                        });
                        setHasVideoTrack(hasVideo);
                    }
                }, 100);
            };

            videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);

            return () => {
                if (videoRef.current) {
                    videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
                }
            };
        }
    }, [stream, displayName]);

    // Monitor video track state
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

        // Monitor track enabled changes
        const checkTrack = () => {
            updateTrackState();
        };

        const interval = setInterval(checkTrack, 200);
        return () => clearInterval(interval);
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
                className={`absolute inset-0 w-full h-full object-cover ${!hasVideoTrack ? 'opacity-0' : 'opacity-100'}`}
            />

            {/* Video off placeholder */}
            {!hasVideoTrack && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                        <VideoOff className="w-8 h-8 text-white/60" />
                    </div>
                </div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Name badge */}
            <div className="absolute bottom-3 left-3 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg z-10">
                <p className="font-medium text-sm text-white">{displayName}</p>
            </div>

            {/* Mic status */}
            <div
                className={`absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-white shadow-sm z-10 ${audioEnabled ? 'bg-blue-600' : 'bg-red-500'
                    }`}
            >
                {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </div>

            {/* Audio level indicator for active speaker */}
            {isActiveSpeaker && audioEnabled && (
                <div className="absolute bottom-0 left-10 right-10 h-1 bg-white/20 rounded-full overflow-hidden mb-1 z-10">
                    <div className="h-full bg-blue-500 w-2/3 mx-auto rounded-full" />
                </div>
            )}
        </div>
    );
};
