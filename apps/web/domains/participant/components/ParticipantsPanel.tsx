import React, { useState } from 'react';
import { UserPlus, ChevronUp, ChevronDown } from 'lucide-react';
import { ParticipantItem } from '@/domains/participant/components/ParticipantItem';

interface Participant {
    id: string;
    displayName: string;
    avatar?: string;
    audioEnabled: boolean;
    videoEnabled: boolean;
}

interface ParticipantsPanelProps {
    participants: Participant[];
    onAddParticipant?: () => void;
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
    participants,
    onAddParticipant,
}) => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="pt-6 px-5 pb-2">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-sm">Participants</h3>
                <div className="flex items-center gap-2">
                    {onAddParticipant && (
                        <button
                            onClick={onAddParticipant}
                            className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                        >
                            <UserPlus className="w-4 h-4" />
                            Add Participant
                        </button>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label={collapsed ? 'Expand' : 'Collapse'}
                    >
                        {collapsed ? (
                            <ChevronDown className="w-5 h-5" />
                        ) : (
                            <ChevronUp className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>

            {!collapsed && (
                <div className="space-y-3">
                    {participants.map((participant) => (
                        <ParticipantItem key={participant.id} participant={participant} />
                    ))}
                </div>
            )}
        </div>
    );
};
