'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Clock, UserCheck, X } from 'lucide-react';
import { useSocket } from '@/shared/hooks/useSocket';

export default function WaitingRoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const { getSocket, isConnected } = useSocket();
    const [displayName] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('displayName') || 'User ' + Math.floor(Math.random() * 1000);
        }
        return 'User ' + Math.floor(Math.random() * 1000);
    });
    const [waitingMessage, setWaitingMessage] = useState('Connecting...');
    const [isWaiting, setIsWaiting] = useState(false);

    useEffect(() => {
        const socket = getSocket();
        if (!socket || !isConnected) return;

        // Join waiting room
        socket.emit('join-waiting-room', { roomId, displayName });
        setIsWaiting(true);

        // Listen for admission
        socket.on('admitted', (data: { roomId: string; message: string }) => {
            setWaitingMessage('Admitted! Joining room...');
            // Redirect to room after short delay
            setTimeout(() => {
                router.push(`/room/${roomId}`);
            }, 1000);
        });

        // Listen for rejection
        socket.on('rejected', (data: { roomId: string; message: string }) => {
            setWaitingMessage(data.message || 'You were not admitted');
            setIsWaiting(false);
        });

        // Listen for updates
        socket.on('waiting-room-joined', (data: { roomId: string; message: string }) => {
            setWaitingMessage(data.message);
        });

        return () => {
            socket.off('admitted');
            socket.off('rejected');
            socket.off('waiting-room-joined');
        };
    }, [getSocket, isConnected, roomId, displayName, router]);

    const handleCancel = () => {
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f111a] via-[#1e293b] to-[#0f111a] flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
            </div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-[#1e2230] border border-[#2e3445] rounded-2xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse">
                            <UserCheck className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Waiting for Host
                        </h1>
                        <p className="text-gray-400 text-sm">
                            {waitingMessage}
                        </p>
                    </div>

                    {/* Animated Dots */}
                    {isWaiting && (
                        <div className="flex justify-center gap-2 mb-8">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3 p-4 bg-[#2a3042] rounded-lg">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                {displayName.charAt(0)}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">{displayName}</p>
                                <p className="text-xs text-gray-400">Joining as</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-[#2a3042] rounded-lg">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-sm font-medium text-white">Room: {roomId}</p>
                                <p className="text-xs text-gray-400">Meeting ID</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={handleCancel}
                            disabled={!isWaiting}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#2a3042] hover:bg-[#343948] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X className="w-5 h-5" />
                            Cancel
                        </button>
                    </div>

                    {/* Footer Note */}
                    <p className="text-center text-xs text-gray-500 mt-6">
                        The host will admit you shortly
                    </p>
                </div>
            </div>
        </div>
    );
}
