'use client';

import React, { useState, useEffect } from 'react';
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
        <div className="fixed bottom-10 right-10 z-40 w-80 bg-[#1e2230] border border-[#2e3445] rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top duration-300">
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
                            {waitingUsers.length} người đang chờ
                        </p>
                        <p className="text-xs text-gray-400">Nhấn để {isExpanded ? 'thu gọn' : 'mở rộng'}</p>
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
    const [waitingTime, setWaitingTime] = useState('');

    // Update waiting time every second
    useEffect(() => {
        const updateTime = () => {
            setWaitingTime(getWaitingTime(user.joinedAt));
        };

        // Initial update
        updateTime();

        // Update every second
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, [user.joinedAt]);

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
                        Đang chờ {waitingTime}
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-3">
                <button
                    onClick={handleAdmit}
                    disabled={isProcessing}
                    className="p-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Cho phép"
                >
                    <Check className="w-4 h-4" />
                </button>
                <button
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Từ chối"
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

    if (diffSec < 60) return `${diffSec} giây`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút`;
    const diffHour = Math.floor(diffMin / 60);
    return `${diffHour} giờ`;
}
