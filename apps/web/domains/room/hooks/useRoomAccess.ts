'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { roomApi, RoomPermissions } from '@/shared/api/room-api';
import { usePreferencesStore } from '@/shared/stores/usePreferencesStore';
import { useSocket } from '@/shared/hooks/useSocket';

const DEFAULT_PERMISSIONS: RoomPermissions = {
    allowChat: true,
    allowScreenShare: true,
    allowMicrophone: true,
    allowCamera: true,
};

export function useRoomAccess(roomId: string) {
    const router = useRouter();
    const { getSocket } = useSocket();
    
    // State
    const [isJoined, setIsJoined] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [isCheckingHost, setIsCheckingHost] = useState(true);
    const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
    const [isHost, setIsHost] = useState(false);
    const [permissions, setPermissions] = useState<RoomPermissions>(DEFAULT_PERMISSIONS);
    
    // Password Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordError, setPasswordError] = useState<string | undefined>();
    const [isValidatingPassword, setIsValidatingPassword] = useState(false);
    
    // Track if auto-join check has been performed to prevent flickering
    const hasCheckedHostRef = useRef(false);
    // Track if a check is currently in progress
    const checkingRef = useRef(false);

    const userId = usePreferencesStore(state => state.userId);
    const storedDisplayName = usePreferencesStore(state => state.displayName);

    // Auto-join for room host
    useEffect(() => {
        const checkAndAutoJoin = async () => {
            // If already joined or checked or checking, don't do anything
            if (isJoined || hasCheckedHostRef.current || checkingRef.current) {
                if (isJoined || hasCheckedHostRef.current) {
                   setIsCheckingHost(false);
                }
                return;
            }

            // If store hydration hasn't happened yet (userId unavail), just wait.
            if (!userId) {
                return;
            }

            checkingRef.current = true;

            try {
                // Fetch both host status and settings in parallel
                const [hostResult, settingsResult] = await Promise.all([
                    roomApi.checkRoomHost(roomId, userId),
                    roomApi.getSettings(roomId),
                ]);

                setIsHost(hostResult.isHost);
                
                if (settingsResult.settings?.permissions) {
                    setPermissions(settingsResult.settings.permissions);
                }

                if (hostResult.isHost) {
                    setDisplayName(storedDisplayName || '');
                    setIsJoined(true);
                }
            } catch (error) {
                console.log('Could not check host status:', error);
            } finally {
                setIsCheckingHost(false);
                hasCheckedHostRef.current = true;
                checkingRef.current = false;
            }
        };

        checkAndAutoJoin();
    }, [roomId, userId, storedDisplayName, isJoined]);

    // Proceed to join room (internal)
    const proceedToJoin = (waitingRoomEnabled: boolean, nameOverride: string) => {
        if (waitingRoomEnabled) {
            setIsInWaitingRoom(true);
            const socket = getSocket();
            if (socket) {
                socket.emit('join-waiting-room', { 
                    roomId, 
                    userId, 
                    displayName: nameOverride 
                });
            }
        } else {
            setIsJoined(true);
        }
    };

    // Handle initial join request from PreJoinScreen
    const handleJoin = async (name: string) => {
        setDisplayName(name);

        try {
            // Fetch both access and settings
            const [access, settingsResult] = await Promise.all([
                roomApi.checkAccess(roomId),
                roomApi.getSettings(roomId),
            ]);

            if (settingsResult.settings?.permissions) {
                setPermissions(settingsResult.settings.permissions);
            }

            if (access.requiresPassword) {
                setShowPasswordModal(true);
                return;
            }

            proceedToJoin(access.waitingRoomEnabled, name);
        } catch (error) {
            console.error('Error checking room access:', error);
            proceedToJoin(false, name);
        }
    };

    // Handle password submission
    const handlePasswordSubmit = async (password: string) => {
        setIsValidatingPassword(true);
        setPasswordError(undefined);

        try {
            const isValid = await roomApi.validatePassword(roomId, password);

            if (isValid) {
                setShowPasswordModal(false);
                const access = await roomApi.checkAccess(roomId);
                proceedToJoin(access.waitingRoomEnabled, displayName);
            } else {
                setPasswordError('Mật khẩu không đúng. Vui lòng thử lại.');
            }
        } catch (error) {
            setPasswordError('Không thể xác thực mật khẩu. Vui lòng thử lại.');
        } finally {
            setIsValidatingPassword(false);
        }
    };

    // Listen for waiting room admission/rejection
    useEffect(() => {
        const socket = getSocket();
        if (socket && isInWaitingRoom) {
            const handleAdmitted = () => {
                setIsInWaitingRoom(false);
                setIsJoined(true);
            };

            const handleRejected = (data: { message: string }) => {
                alert(data.message || 'You were denied access to the room.');
                setIsInWaitingRoom(false);
                router.push('/');
            };

            socket.on('admitted', handleAdmitted);
            socket.on('rejected', handleRejected);

            return () => {
                socket.off('admitted', handleAdmitted);
                socket.off('rejected', handleRejected);
            };
        }
    }, [getSocket, isInWaitingRoom, router]);

    return {
        isJoined,
        displayName,
        isCheckingHost,
        isInWaitingRoom,
        isHost,
        permissions,
        showPasswordModal,
        passwordError,
        isValidatingPassword,
        setShowPasswordModal,
        handleJoin,
        handlePasswordSubmit,
    };
}

