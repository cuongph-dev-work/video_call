'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { screenShareConstraints } from '@/domains/media/lib/webrtc-config';
import type { Socket } from 'socket.io-client';

export function useScreenShare(socket: (() => Socket | null) | null) {
  const [isSharing, setIsSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopScreenShareRef = useRef<((roomId: string) => void) | null>(null);

  const stopScreenShare = useCallback((roomId: string) => {
    setScreenStream(prevStream => {
      if (prevStream) {
        prevStream.getTracks().forEach(track => track.stop());
      }
      return null;
    });
    
    setIsSharing(false);

    // Notify other participants
    const socketInstance = socket?.();
    if (socketInstance) {
      socketInstance.emit('participant:state', { 
        roomId, 
        state: { isScreenSharing: false } 
      });
    }
  }, [socket]);

  // Update ref in effect to avoid updating during render
  useEffect(() => {
    stopScreenShareRef.current = stopScreenShare;
  }, [stopScreenShare]);

  const startScreenShare = useCallback(async (roomId: string) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(screenShareConstraints);
      
      setScreenStream(stream);
      setIsSharing(true);
      setError(null);

      // Notify other participants
      const socketInstance = socket?.();
      if (socketInstance) {
        socketInstance.emit('participant:state', {
          roomId,
          state: { isScreenSharing: true }
        });
      }

      // Handle when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        if (stopScreenShareRef.current) {
          stopScreenShareRef.current(roomId);
        }
      };

      return stream;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start screen share';
      console.error('Error starting screen share:', err);
      setError(message);
      return null;
    }
  }, [socket]);

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
