'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSocket } from '@/shared/hooks/useSocket';
import type { ParticipantState } from '@video-call/types';

interface UseParticipantSyncProps {
    roomId: string;
    isJoined: boolean;
    onStateChanged?: (userId: string, state: ParticipantState) => void;
}

/**
 * Hook for syncing participant state (mic, camera, etc.) via socket
 * Uses the unified participant:state event for extensibility
 */
export function useParticipantSync({
    roomId,
    isJoined,
    onStateChanged,
}: UseParticipantSyncProps) {
    const { getSocket } = useSocket();
    const onStateChangedRef = useRef(onStateChanged);
    
    // Keep ref updated to avoid re-binding listeners
    useEffect(() => {
        onStateChangedRef.current = onStateChanged;
    }, [onStateChanged]);

    // Listen for other participants' state changes
    useEffect(() => {
        if (!isJoined) return;
        
        const socket = getSocket();
        if (!socket) return;

        const handleStateChanged = (data: {
            userId: string;
            state: ParticipantState;
            timestamp: number;
        }) => {
            onStateChangedRef.current?.(data.userId, data.state);
        };

        socket.on('participant:state-changed', handleStateChanged);

        return () => {
            socket.off('participant:state-changed', handleStateChanged);
        };
    }, [getSocket, isJoined]);

    /**
     * Update own participant state and broadcast to others
     */
    const updateState = useCallback((state: ParticipantState) => {
        const socket = getSocket();
        if (!socket || !roomId) return;

        socket.emit('participant:state', {
            roomId,
            state,
        });
    }, [getSocket, roomId]);

    /**
     * Convenience methods for common state changes
     */
    const updateAudio = useCallback((enabled: boolean) => {
        updateState({ audioEnabled: enabled });
    }, [updateState]);

    const updateVideo = useCallback((enabled: boolean) => {
        updateState({ videoEnabled: enabled });
    }, [updateState]);

    const updateScreenShare = useCallback((isSharing: boolean) => {
        updateState({ isScreenSharing: isSharing });
    }, [updateState]);

    const raiseHand = useCallback((raised: boolean) => {
        updateState({ handRaised: raised });
    }, [updateState]);

    return {
        updateState,
        updateAudio,
        updateVideo,
        updateScreenShare,
        raiseHand,
    };
}
