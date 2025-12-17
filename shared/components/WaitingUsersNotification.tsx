'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Check, X, Users } from 'lucide-react';
import type { WaitingUser } from '@video-call/types';

interface WaitingUsersNotificationProps {
    waitingUsers: WaitingUser[];
    onAdmit: (userId: string) => void;
    onReject: (userId: string) => void;
}

export const WaitingUsersNotification: React.FC<WaitingUsersNotificationProps> = ({
    waitingUsers,
    onAdmit,
    onReject,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (waitingUsers.length === 0) return null;

    return (
        <div className="fixed top-24 right-6 z-40 w-80 bg-[#1e2230] border border-[#2e3445] rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top duration-300">
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 bg-blue-600/10 border-b border-[#2e3445] cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">
                            {waitingUsers.length} waiting to join
                        </p>
                        <p className="text-xs text-gray-400">Click to {isExpanded ? 'collapse' : 'expand'}</p>
                    </div>
                </div>
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {waitingUsers.length}
                </div>
            </div>

            {/* User List */}
            {isExpanded && (
                <div className="max-h-96 overflow-y-auto">
                    {waitingUsers.map((user) => (
                        <WaitingUserItem
                            key={user.id}
                            user={user}
                            onAdmit={() => onAdmit(user.id)}
                            onReject={() => onReject(user.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Individual User Item Component
interface WaitingUserItemProps {
    user: WaitingUser;
    onAdmit: () => void;
    onReject: () => void;
}

const WaitingUserItem: React.FC<WaitingUserItemProps> = ({ user, onAdmit, onReject }) => {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleAdmit = async () => {
        setIsProcessing(true);
        await onAdmit();
    };

    const handleReject = async () => {
        setIsProcessing(true);
        await onReject();
    };

    return (
        <div className="flex items-center justify-between p-4 border-b border-[#2e3445] hover:bg-[#2a3042] transition-colors">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {user.avatar ? (
                    <Image
                        src={user.avatar}
                        alt={user.displayName}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {user.displayName.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.displayName}</p>
                    <p className="text-xs text-gray-400">
                        Waiting {getWaitingTime(user.joinedAt)}
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-3">
                <button
                    onClick={handleAdmit}
                    disabled={isProcessing}
                    className="p-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Admit"
                >
                    <Check className="w-4 h-4" />
                </button>
                <button
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Reject"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// Helper function to calculate waiting time
function getWaitingTime(joinedAt: Date): string {
    const now = new Date();
    const joined = new Date(joinedAt);
    const diffMs = now.getTime() - joined.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour}h ago`;
}
