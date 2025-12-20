import { useEffect, useState } from 'react';

interface RoomTabGuardOptions {
    roomId: string;
    userId: string;
    enabled?: boolean;
}

/**
 * Hook to detect and prevent duplicate tabs joining the same room
 * Uses BroadcastChannel API to communicate between tabs
 */
export const useRoomTabGuard = ({ roomId, userId, enabled = true }: RoomTabGuardOptions) => {
    const [isDuplicateTab, setIsDuplicateTab] = useState(false);

    useEffect(() => {
        if (!enabled || !roomId || !userId) return;

        // Check if BroadcastChannel is supported
        if (typeof BroadcastChannel === 'undefined') {
            console.warn('BroadcastChannel not supported, duplicate tab detection disabled');
            return;
        }

        const channelName = `room-${roomId}`;
        const channel = new BroadcastChannel(channelName);

        // Listen for messages from other tabs
        channel.onmessage = (event) => {
            const { type, userId: messageUserId, timestamp } = event.data;

            // If another tab with same userId is already in this room
            if (type === 'room-joined' && messageUserId === userId) {
                console.warn('Duplicate tab detected for room:', roomId);
                setIsDuplicateTab(true);
            }

            // Response to ping from new tabs
            if (type === 'ping' && messageUserId === userId) {
                channel.postMessage({
                    type: 'pong',
                    userId,
                    timestamp: Date.now(),
                });
            }

            // If existing tab responds, this is a duplicate
            if (type === 'pong' && messageUserId === userId) {
                console.warn('Existing tab detected for room:', roomId);
                setIsDuplicateTab(true);
            }
        };

        // Ping to check if any tabs are already in this room
        channel.postMessage({
            type: 'ping',
            userId,
            timestamp: Date.now(),
        });

        // Wait a bit for responses, then announce join if no duplicates
        const announceTimer = setTimeout(() => {
            if (!isDuplicateTab) {
                channel.postMessage({
                    type: 'room-joined',
                    userId,
                    timestamp: Date.now(),
                });
            }
        }, 100);

        // Cleanup on unmount
        return () => {
            clearTimeout(announceTimer);
            channel.postMessage({
                type: 'room-left',
                userId,
                timestamp: Date.now(),
            });
            channel.close();
        };
    }, [roomId, userId, enabled, isDuplicateTab]);

    return { isDuplicateTab };
};
