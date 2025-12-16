import React from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import Image from 'next/image';

interface ParticipantItemProps {
    participant: {
        id: string;
        displayName: string;
        avatar?: string;
        audioEnabled: boolean;
        videoEnabled: boolean;
    };
}

export const ParticipantItem: React.FC<ParticipantItemProps> = ({ participant }) => {
    return (
        <div className="flex items-center justify-between bg-[#2c303f]/30 p-2 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
                {participant.avatar ? (
                    <Image
                        src={participant.avatar}
                        alt={participant.displayName}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                        {participant.displayName.charAt(0).toUpperCase()}
                    </div>
                )}
                <span className="text-sm font-medium text-white">{participant.displayName}</span>
            </div>

            <div className="flex gap-2 text-gray-400">
                {participant.audioEnabled ? (
                    <Mic className="w-5 h-5 text-blue-500" />
                ) : (
                    <MicOff className="w-5 h-5 text-red-500" />
                )}
                {participant.videoEnabled ? (
                    <Video className="w-5 h-5 text-blue-500" />
                ) : (
                    <VideoOff className="w-5 h-5 text-red-500" />
                )}
            </div>
        </div>
    );
};
