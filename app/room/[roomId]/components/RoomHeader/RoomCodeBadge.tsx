import React, { useState } from 'react';
import { Link, Check } from 'lucide-react';

interface RoomCodeBadgeProps {
    roomCode: string;
}

export const RoomCodeBadge: React.FC<RoomCodeBadgeProps> = ({ roomCode }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="bg-blue-900/30 rounded-full pl-1 pr-4 py-1 flex items-center gap-2 border border-blue-500/20">
            <button
                onClick={handleCopy}
                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition-colors"
                aria-label="Copy room code"
            >
                {copied ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
            </button>
            <span className="text-blue-400 text-sm font-medium">{roomCode}</span>
        </div>
    );
};
