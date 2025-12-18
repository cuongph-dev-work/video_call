'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '@/shared/hooks/useSocket';
import { useChatStore } from '@/domains/chat/stores/useChatStore';
import { Participant, Message } from '../types';
import type { WaitingUser } from '../../../../../packages/types/src/waiting-room';

interface UseRoomEventsProps {
    roomId: string;
    isJoined: boolean;
    displayName: string;
    userId: string;
    isMobile: boolean;
    isChatOpen: boolean;
    audioEnabled: boolean;
    videoEnabled: boolean;
}

export function useRoomEvents({
    roomId,
    isJoined,
    displayName,
    userId,
    isMobile,
    isChatOpen,
    audioEnabled,
    videoEnabled,
}: UseRoomEventsProps) {
    const { getSocket, isConnected } = useSocket();
    const { addMessage } = useChatStore();
    
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [waitingUsers, setWaitingUsers] = useState<WaitingUser[]>([]);
    
    // Track initialization to prevent double join
    const hasJoinedRef = useRef(false);
    
    // Refs for socket callbacks to access latest state without re-binding listeners
    const isChatOpenRef = useRef(isChatOpen);
    const isMobileRef = useRef(isMobile);

    useEffect(() => {
        isChatOpenRef.current = isChatOpen;
        isMobileRef.current = isMobile;
    }, [isChatOpen, isMobile]);

    // Join Room & Setup Listeners
    useEffect(() => {
        const socket = getSocket();
        
        if (socket && isConnected && roomId && isJoined && displayName && userId) {
            if (!hasJoinedRef.current) {
                hasJoinedRef.current = true;
                socket.emit('join-room', {
                    roomId,
                    userId,
                    displayName,
                    audioEnabled,
                    videoEnabled,
                });
            }
            
            // Room Joined Handler
            socket.on('room-joined', (data: { roomId: string; participants: Participant[] }) => {
                setParticipants(data.participants || []);
                // Request waiting users list immediately
                socket.emit('get-waiting-users', { roomId });
            });

            // User Joined Handler
            socket.on('user-joined', (data: { participant: Participant }) => {
                setParticipants(prev => {
                    if (prev.find(p => p.id === data.participant.id)) return prev;
                    return [...prev, data.participant];
                });
            });

            // User Left Handler
            socket.on('user-left', (data: { userId: string }) => {
                setParticipants(prev => prev.filter(p => p.id !== data.userId));
            });

            // Audio/Video Status Handlers
            socket.on('participant-audio-changed', (data: { userId: string; enabled: boolean }) => {
                setParticipants(prev =>
                    prev.map(p => (p.id === data.userId ? { ...p, audioEnabled: data.enabled } : p))
                );
            });

            socket.on('participant-video-changed', (data: { userId: string; enabled: boolean }) => {
                setParticipants(prev =>
                    prev.map(p => (p.id === data.userId ? { ...p, videoEnabled: data.enabled } : p))
                );
            });

            // Chat Message Handler
            socket.on('chat-message', (data: Message) => {
                const shouldIncrement = isMobileRef.current ? !isChatOpenRef.current : false;

                addMessage({
                    ...data,
                    isPrivate: false,
                    timestamp: data.timestamp
                }, shouldIncrement);
            });

            // Waiting Room Listeners
            socket.on('user-waiting', (data: { user: WaitingUser; waitingCount: number }) => {
                console.log('🔔 Received user-waiting event:', data);
                setWaitingUsers(prev => {
                    if (prev.find(u => u.id === data.user.id)) return prev;
                    return [...prev, data.user];
                });
            });

            socket.on('waiting-count-updated', () => {
                socket.emit('get-waiting-users', { roomId });
            });

            socket.on('waiting-users-list', (data: { roomId: string; users: WaitingUser[] }) => {
                console.log('📋 Received waiting-users-list:', data.users);
                setWaitingUsers(data.users);
            });
        }
        
        return () => {
            if (socket) {
                socket.off('room-joined');
                socket.off('user-joined');
                socket.off('user-left');
                socket.off('participant-audio-changed');
                socket.off('participant-video-changed');
                socket.off('chat-message');
                socket.off('user-waiting');
                socket.off('waiting-count-updated');
                socket.off('waiting-users-list');
                // Note: hasJoinedRef persists
            }
        };
    }, [getSocket, isConnected, roomId, isJoined, displayName, userId, addMessage]);

    // Actions
    const handleSendMessage = useCallback((content: string) => {
        const socket = getSocket();
        if (socket && displayName) {
            const message: Message = {
                id: Date.now().toString(),
                senderId: socket.id || 'unknown',
                senderName: displayName,
                content,
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            };
            socket.emit('chat-message', { roomId, message });

            // Add to store (don't increment unread for own messages)
            addMessage({
                ...message,
                isPrivate: false,
                timestamp: message.timestamp
            }, false);
        }
    }, [getSocket, displayName, roomId, addMessage]);

    const handleAdmitUser = useCallback((targetUserId: string) => {
        const socket = getSocket();
        if (socket) {
            socket.emit('admit-user', { roomId, userId: targetUserId });
            setWaitingUsers(prev => prev.filter(u => u.id !== targetUserId));
        }
    }, [getSocket, roomId]);

    const handleRejectUser = useCallback((targetUserId: string) => {
        const socket = getSocket();
        if (socket) {
            socket.emit('reject-user', { roomId, userId: targetUserId, reason: 'Access denied' });
            setWaitingUsers(prev => prev.filter(u => u.id !== targetUserId));
        }
    }, [getSocket, roomId]);

    return {
        participants,
        waitingUsers,
        handleSendMessage,
        handleAdmitUser,
        handleRejectUser,
    };
}
