'use client';

import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { useSocket } from '@/shared/hooks/useSocket';
import { useChatStore } from '@/domains/chat/stores/useChatStore';
import { usePreferencesStore } from '@/shared/stores/usePreferencesStore';
import { useRoomStore } from '../stores/useRoomStore';
import { RoomSocketManager } from '../services/RoomSocketManager';

/**
 * Main orchestration hook for room functionality
 * Provides clean API for components, hides complexity
 */
export function useRoomController(
  roomId: string,
  localMedia: {
    toggleAudio: () => void;
    toggleVideo: () => void;
    audioEnabled: boolean;
    videoEnabled: boolean;
  }
) {
  const { getSocket, isConnected } = useSocket();
  const { addMessage } = useChatStore();
  const userId = usePreferencesStore((state) => state.userId);
  const displayName = usePreferencesStore((state) => state.displayName);

  // Destructure for easier access
  const { 
    toggleAudio: toggleLocalAudio, 
    toggleVideo: toggleLocalVideo, 
    audioEnabled, 
    videoEnabled 
  } = localMedia;

  // Socket manager singleton (one per room)
  const socketManagerRef = useRef<RoomSocketManager | null>(null);
  const [isManagerReady, setIsManagerReady] = useState(false);
  const isJoined = useRoomStore((state) => state.isJoined);
  const prevConnected = useRef(isConnected);

  // Initialize socket manager - keep listeners stable!
  useEffect(() => {
    const socket = getSocket();
    
    if (!socket || !isConnected || !roomId) {
      return;
    }

    // Create manager if it doesn't exist
    if (!socketManagerRef.current) {
      socketManagerRef.current = new RoomSocketManager(
        useRoomStore.getState(),
        (message) => {
          const isMobile = window.innerWidth < 768;
          const shouldIncrement = isMobile ? !useRoomStore.getState().isChatOpen : false;
          addMessage(
            { ...message, isPrivate: false, timestamp: message.timestamp },
            shouldIncrement
          );
        }
      );
    }

    // ALWAYS call initialize with current socket (handles HMR socket changes)
    socketManagerRef.current.initialize(socket, roomId);
    setIsManagerReady(true);
    
    // NO CLEANUP HERE - let unmount effect handle it
  }, [roomId, isConnected]);

  // Re-join logic for reconnection (handles HMR and network drops)
  useEffect(() => {
    const wasConnected = prevConnected.current;
    
    // Update ref for next run
    prevConnected.current = isConnected; 
    
    // If we transitioned from Disconnected -> Connected, AND we are supposed to be in a room
    if (isConnected && !wasConnected && isJoined && socketManagerRef.current && userId && displayName) {
      socketManagerRef.current.joinRoom(userId, {
        displayName,
        audioEnabled,
        videoEnabled,
      });
    }
  }, [isConnected, isJoined, userId, displayName, audioEnabled, videoEnabled]);
  
  useEffect(() => {
    return () => {
      socketManagerRef.current?.cleanup();
      socketManagerRef.current = null;
      setIsManagerReady(false);
      useRoomStore.getState().reset();
    };
  }, [roomId]);

  // ============================================
  // PUBLIC API
  // ============================================

  const joinRoom = useCallback(() => {  
    if (!socketManagerRef.current || !userId || !displayName) {
      return;
    }

    socketManagerRef.current.joinRoom(userId, {
      displayName,
      audioEnabled,
      videoEnabled,
    });
  }, [userId, displayName, audioEnabled, videoEnabled]);

  const leaveRoom = useCallback(() => {
    socketManagerRef.current?.leaveRoom();
  }, []);

  const toggleAudio = useCallback(() => {
    toggleLocalAudio();
    const newState = !audioEnabled;
    socketManagerRef.current?.updateState({ audioEnabled: newState });
  }, [toggleLocalAudio, audioEnabled]);

  const toggleVideo = useCallback(() => {
    toggleLocalVideo();
    const newState = !videoEnabled;
    socketManagerRef.current?.updateState({ videoEnabled: newState });
  }, [toggleLocalVideo, videoEnabled]);

  const updateScreenShare = useCallback((isSharing: boolean) => {
    socketManagerRef.current?.updateState({ isScreenSharing: isSharing });
  }, []);

  const sendMessage = useCallback(
    (content: string) => {
      if (!userId || !displayName) return;
      socketManagerRef.current?.sendMessage(content, userId, displayName);
    },
    [userId, displayName]
  );

  const admitUser = useCallback((targetUserId: string) => {
    socketManagerRef.current?.admitUser(targetUserId);
  }, []);

  const rejectUser = useCallback((targetUserId: string, reason?: string) => {
    socketManagerRef.current?.rejectUser(targetUserId, reason);
  }, []);

  const reportConnectionQuality = useCallback(
    (quality: 'excellent' | 'good' | 'fair' | 'poor') => {
      socketManagerRef.current?.reportConnectionQuality(quality);
    },
    []
  );

  return {
    // Status
    isManagerReady,
    
    // Core actions
    joinRoom,
    leaveRoom,

    // Media controls
    toggleAudio,
    toggleVideo,
    updateScreenShare,

    // Chat
    sendMessage,

    // Waiting room
    admitUser,
    rejectUser,

    // Connection quality
    reportConnectionQuality,
  };
}
