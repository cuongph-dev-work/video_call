'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useSocket } from '@/shared/hooks/useSocket';
import type { RoomSettingsState, RoomPermissions } from '@video-call/types';

const DEFAULT_PERMISSIONS: RoomPermissions = {
    allowMicrophone: true,
    allowCamera: true,
    allowScreenShare: true,
    allowChat: true,
};

interface UseRoomSettingsProps {
    roomId: string;
    isJoined: boolean;
    isHost: boolean;
}

/**
 * Hook for managing room settings via socket
 * Only host can update settings, all participants receive updates
 */
export function useRoomSettings({
    roomId,
    isJoined,
    isHost,
}: UseRoomSettingsProps) {
    const { getSocket } = useSocket();
    const [settings, setSettings] = useState<RoomSettingsState>({
        permissions: DEFAULT_PERMISSIONS,
    });
    const [isLoading, setIsLoading] = useState(false);
    const hasInitializedRef = useRef(false);

    // Fetch initial settings when joining
    useEffect(() => {
        if (!isJoined || hasInitializedRef.current) return;
        
        const socket = getSocket();
        if (!socket) return;

        setIsLoading(true);
        socket.emit('room:get-settings', { roomId });
        hasInitializedRef.current = true;
    }, [getSocket, isJoined, roomId]);

    // Listen for settings updates
    useEffect(() => {
        if (!isJoined) return;
        
        const socket = getSocket();
        if (!socket) return;

        // Handle initial sync
        const handleSettingsSync = (data: { settings: RoomSettingsState }) => {
            setSettings(prev => ({
                ...prev,
                ...data.settings,
                permissions: {
                    ...DEFAULT_PERMISSIONS,
                    ...prev.permissions,
                    ...data.settings.permissions,
                },
            }));
            setIsLoading(false);
        };

        // Handle settings changes
        const handleSettingsChanged = (data: {
            settings: RoomSettingsState;
            changedBy: string;
            timestamp: number;
        }) => {
            setSettings(prev => ({
                ...prev,
                ...data.settings,
                permissions: {
                    ...prev.permissions,
                    ...data.settings.permissions,
                },
            }));
        };

        socket.on('room:settings-sync', handleSettingsSync);
        socket.on('room:settings-changed', handleSettingsChanged);

        return () => {
            socket.off('room:settings-sync', handleSettingsSync);
            socket.off('room:settings-changed', handleSettingsChanged);
        };
    }, [getSocket, isJoined]);

    /**
     * Update room settings (host only)
     */
    const updateSettings = useCallback((updates: Partial<RoomSettingsState>) => {
        if (!isHost) {
            console.warn('Only host can update room settings');
            return;
        }

        const socket = getSocket();
        if (!socket || !roomId) return;

        socket.emit('room:settings', {
            roomId,
            settings: updates,
        });

        // Optimistic update
        setSettings(prev => ({
            ...prev,
            ...updates,
            permissions: {
                ...prev.permissions,
                ...updates.permissions,
            },
        }));
    }, [getSocket, isHost, roomId]);

    /**
     * Convenience methods for common permission changes
     */
    const updatePermission = useCallback((
        key: keyof RoomPermissions,
        value: boolean
    ) => {
        updateSettings({
            permissions: { [key]: value },
        });
    }, [updateSettings]);

    const toggleLockRoom = useCallback(() => {
        updateSettings({ lockRoom: !settings.lockRoom });
    }, [settings.lockRoom, updateSettings]);

    return {
        settings,
        permissions: settings.permissions || DEFAULT_PERMISSIONS,
        isLoading,
        updateSettings,
        updatePermission,
        toggleLockRoom,
    };
}
