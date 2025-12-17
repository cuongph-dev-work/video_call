'use client';

import { useState, useEffect, useCallback } from 'react';
import { screenShareConstraints } from '@/domains/media/lib/webrtc-config';

export function useScreenShare(socket: (() => any) | null) {
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startScreenShare = useCallback(async (roomId: string) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(screenShareConstraints);
      
      setScreenStream(stream);
      setIsSharing(true);
      setError(null);

      // Notify other participants
      const socketInstance = socket?.();
      if (socketInstance) {
        socketInstance.emit('screen-share-start', {
          roomId,
          displayName: 'Screen Share',
        });
      }

      // Handle when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare(roomId);
      };

      return stream;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start screen share';
      console.error('Error starting screen share:', err);
      setError(message);
      return null;
    }
  }, [socket]);

  const stopScreenShare = useCallback((roomId: string) => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    
    setIsSharing(false);

    // Notify other participants
    const socketInstance = socket?.();
    if (socketInstance) {
      socketInstance.emit('screen-share-stop', { roomId });
    }
  }, [screenStream, socket]);

  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [screenStream]);

  return {
    isSharing,
    screenStream,
    error,
    startScreenShare,
    stopScreenShare,
  };
}
