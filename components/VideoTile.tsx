'use client';

import { useEffect, useRef } from 'react';

interface VideoTileProps {
    stream: MediaStream | null;
    displayName: string;
    isMuted?: boolean;
    isVideoOff?: boolean;
    isLocal?: boolean;
    className?: string;
}

export function VideoTile({
    stream,
    displayName,
    isMuted = false,
    isVideoOff = false,
    isLocal = false,
    className = '',
}: VideoTileProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`}>
            {/* Video Element */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal} // Always mute local video to prevent feedback
                className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`}
            />

            {/* Video Off Placeholder */}
            {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                </div>
            )}

            {/* Name Overlay */}
            <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/60 rounded text-white text-sm">
                {displayName} {isLocal && '(You)'}
            </div>

            {/* Muted Icon */}
            {isMuted && (
                <div className="absolute top-2 right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                    <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                        />
                    </svg>
                </div>
            )}
        </div>
    );
}
