import React from 'react';
import Image from 'next/image';

interface ParticipantStackProps {
    participants: Array<{
        id: string;
        displayName: string;
        avatar?: string;
    }>;
    maxVisible?: number;
}

export const ParticipantStack: React.FC<ParticipantStackProps> = ({
    participants,
    maxVisible = 4,
}) => {
    const visibleParticipants = participants.slice(0, maxVisible);
    const remainingCount = Math.max(0, participants.length - maxVisible);

    return (
        <div className="flex -space-x-2 items-center">
            {visibleParticipants.map((participant, index) => (
                <div
                    key={participant.id}
                    className="w-9 h-9 rounded-full border-2 border-[#13161f] relative"
                    style={{ zIndex: maxVisible - index }}
                >
                    {participant.avatar ? (
                        <Image
                            src={participant.avatar}
                            alt={participant.displayName}
                            width={36}
                            height={36}
                            className="rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {participant.displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
            ))}
            {remainingCount > 0 && (
                <div
                    className="w-9 h-9 rounded-full border-2 border-[#13161f] bg-blue-600 flex items-center justify-center text-xs font-bold text-white relative"
                    style={{ zIndex: maxVisible + 1 }}
                >
                    +{remainingCount}
                </div>
            )}
        </div>
    );
};
