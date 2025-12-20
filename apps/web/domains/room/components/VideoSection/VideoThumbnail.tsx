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

    // Attach stream and handle video playback
    useEffect(() => {
        if (!videoRef.current || !stream) return;

        const videoElement = videoRef.current;

        // Pause and clear srcObject before setting new one to prevent AbortError
        videoElement.pause();
        videoElement.srcObject = null;

        // Small delay to ensure clean state
        const setupStream = () => {
            videoElement.srcObject = stream;

            let canplayFired = false;
            let fallbackTimeout: NodeJS.Timeout | null = null;
            let playInProgress = false;

            // Attempt to play video
            const attemptPlay = async () => {
                if (!videoElement || playInProgress) return;

                playInProgress = true;
                try {
                    await videoElement.play();
                } catch (err) {
                    // Ignore AbortError (happens when srcObject changes)
                    if (err instanceof Error && err.name !== 'AbortError') {
                        console.error(`Failed to play video for ${displayName}:`, err);
                    }
                } finally {
                    playInProgress = false;
                }
            };

            // Smart play: Check readyState and decide strategy
            const initializePlayback = () => {
                if (!videoElement) return;

                // If video has sufficient data (readyState >= 3), play immediately
                if (videoElement.readyState >= 3) {
                    attemptPlay();
                } else {
                    // Otherwise, wait for canplay event with a fallback timeout
                    fallbackTimeout = setTimeout(() => {
                        if (!canplayFired && videoElement) {
                            attemptPlay();
                        }
                    }, 500);
                }
            };

            // Handlers
            const handleError = (e: Event) => {
                console.error(`Video error for ${displayName}:`, e);
            };

            const handleCanPlay = () => {
                canplayFired = true;
                if (fallbackTimeout) {
                    clearTimeout(fallbackTimeout);
                    fallbackTimeout = null;
                }
                attemptPlay();
            };

            const handleLoadedMetadata = () => {
                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) {
                    setHasVideoTrack(videoTrack.enabled && !videoTrack.muted);
                }
            };

            // Add event listeners
            videoElement.addEventListener('error', handleError);
            videoElement.addEventListener('canplay', handleCanPlay);
            videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);

            // Initialize playback
            initializePlayback();

            // Cleanup
            return () => {
                if (fallbackTimeout) {
                    clearTimeout(fallbackTimeout);
                }
                videoElement.removeEventListener('error', handleError);
                videoElement.removeEventListener('canplay', handleCanPlay);
                videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            };
        };

        // Add small delay to ensure clean state
        const setupTimeout = setTimeout(setupStream, 50);

        return () => {
            clearTimeout(setupTimeout);
            // Pause before cleanup to prevent AbortError
            videoElement.pause();
        };
    }, [stream, displayName]);

    // Monitor video track enabled state
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

        // Check if track is actually active (enabled and not muted)
        const isTrackActive = () => {
            return videoTrack.enabled && !videoTrack.muted;
        };

        // Set initial state
        setHasVideoTrack(isTrackActive());

        // Event-based updates for track state changes
        const handleMute = () => {
            setHasVideoTrack(false);
        };

        const handleUnmute = () => {
            setHasVideoTrack(isTrackActive());
        };

        const handleEnded = () => {
            setHasVideoTrack(false);
        };

        videoTrack.addEventListener('mute', handleMute);
        videoTrack.addEventListener('unmute', handleUnmute);
        videoTrack.addEventListener('ended', handleEnded);

        // Poll for track state changes (fallback for enabled changes)
        const checkTrack = () => {
            setHasVideoTrack(isTrackActive());
        };

        const interval = setInterval(checkTrack, 200);

        return () => {
            clearInterval(interval);
            videoTrack.removeEventListener('mute', handleMute);
            videoTrack.removeEventListener('unmute', handleUnmute);
            videoTrack.removeEventListener('ended', handleEnded);
        };
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
