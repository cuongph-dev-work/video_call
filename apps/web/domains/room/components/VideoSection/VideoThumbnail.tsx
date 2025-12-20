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

            // Listen for errors
            const handleError = (e: Event) => {
                console.error(`Video element error for ${displayName}:`, e);
            };
            videoRef.current.addEventListener('error', handleError);

            // Wait for video to be ready before playing
            const handleCanPlay = () => {
                if (videoRef.current) {
                    videoRef.current.play().catch(err => {
                        console.error(`Failed to play video for ${displayName}:`, err);
                    });
                }
            };

            videoRef.current.addEventListener('canplay', handleCanPlay);

            // Update track state when metadata loads
            const handleLoadedMetadata = () => {
                setTimeout(() => {
                    const videoTrack = stream.getVideoTracks()[0];
                    if (videoTrack) {
                        setHasVideoTrack(videoTrack.enabled);
                    }
                }, 100);
            };

            videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);

            return () => {
                if (videoRef.current) {
                    videoRef.current.removeEventListener('error', handleError);
                    videoRef.current.removeEventListener('canplay', handleCanPlay);
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

        // Set initial state - only check enabled for remote tracks
        // track.muted can fluctuate due to network/negotiation
        setHasVideoTrack(videoTrack.enabled);

        // Monitor track enabled changes
        const checkTrack = () => {
            setHasVideoTrack(videoTrack.enabled);
        };

        const interval = setInterval(checkTrack, 200);
        return () => clearInterval(interval);
    }, [stream]);

    return (
        <div
            className={`relative bg-[#1c1f2e] rounded-2xl overflow-hidden group h-full ${isActiveSpeaker
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
