'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { roomApi, RoomPermissions } from '@/shared/api/room-api';
import { usePreferencesStore } from '@/shared/stores/usePreferencesStore';
import { useSocket } from '@/shared/hooks/useSocket';
import { useRoomStore } from '../stores/useRoomStore';

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
    const [showRoomNotFound, setShowRoomNotFound] = useState(false);
    
    // Password Modal State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordError, setPasswordError] = useState<string | undefined>();
    const [isValidatingPassword, setIsValidatingPassword] = useState(false);
    
    // Rejection Modal State
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionMessage, setRejectionMessage] = useState('');
    
    // Track if auto-join check has been performed to prevent flickering
    const hasCheckedHostRef = useRef(false);
    // Track if a check is currently in progress
    const checkingRef = useRef(false);

    const userId = usePreferencesStore(state => state.userId);
    const storedDisplayName = usePreferencesStore(state => state.displayName);
    const isAdmittedToRoom = usePreferencesStore(state => state.isAdmittedToRoom);
    const markRoomAsAdmitted = usePreferencesStore(state => state.markRoomAsAdmitted);

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
                // Fetch room info (includes host status, settings, participant count)
                const roomInfo = await roomApi.getRoomInfo(roomId, userId);

                setIsHost(roomInfo.isHost);
                
                if (roomInfo.settings?.permissions) {
                    setPermissions(roomInfo.settings.permissions);
                }

                // Auto-join if user is host OR previously admitted to this room
                const isAdmitted = isAdmittedToRoom(roomId);
                
                if (roomInfo.isHost || isAdmitted) {
                    setDisplayName(storedDisplayName || '');
                    setIsJoined(true);
                    
                    // IMPORTANT: Sync with global room store
                    useRoomStore.getState().setJoined(true);
                    useRoomStore.getState().setHost(roomInfo.isHost);
                    useRoomStore.getState().setRoomId(roomId);
                    
                    if (isAdmitted) {
                        console.log(`✅ Auto-joining room ${roomId} - user was previously admitted`);
                    } else {
                        console.log(`✅ Auto-joining room ${roomId} - user is host`);
                    }
                }
            } catch (error) {
                // Check if it's a 404 error (room not found)
                if (error instanceof Error && error.message.includes('not found')) {
                    setShowRoomNotFound(true);
                } else {
                    console.log('Could not check host status:', error);
                }
            } finally {
                setIsCheckingHost(false);
                hasCheckedHostRef.current = true;
                checkingRef.current = false;
            }
        };

        checkAndAutoJoin();
    }, [roomId, userId, storedDisplayName, isJoined, isAdmittedToRoom]);

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
            // Sync with global store
            useRoomStore.getState().setJoined(true);
            useRoomStore.getState().setRoomId(roomId);
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
                console.log(`🎉 User admitted to room ${roomId}, saving admission status`);
                markRoomAsAdmitted(roomId);
                setIsInWaitingRoom(false);
                setIsJoined(true);
                // Sync with global store
                useRoomStore.getState().setJoined(true);
                useRoomStore.getState().setRoomId(roomId);
            };

            const handleRejected = (data: { message: string }) => {
                console.log('❌ User rejected from room:', data);
                setIsInWaitingRoom(false);
                setShowRejectionModal(true);
                setRejectionMessage(data.message || 'Bạn đã bị từ chối tham gia phòng họp này.');
                // Note: RejectionModal handles auto-redirect after 3s
            };

            socket.on('admitted', handleAdmitted);
            socket.on('rejected', handleRejected);

            return () => {
                socket.off('admitted', handleAdmitted);
                socket.off('rejected', handleRejected);
            };
        }
    }, [getSocket, isInWaitingRoom, router, markRoomAsAdmitted, roomId]);

    return {
        isJoined,
        displayName,
        isCheckingHost,
        isInWaitingRoom,
        isHost,
        permissions,
        showRoomNotFound,
        showPasswordModal,
        passwordError,
        isValidatingPassword,
        showRejectionModal,
        rejectionMessage,
        setShowPasswordModal,
        setShowRejectionModal,
        handleJoin,
        handlePasswordSubmit,
    };
}


