'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
    
    const newSocket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      setIsConnected(true);
      setIsReconnecting(false);
      setError(null);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setIsConnected(false);
      
      // If disconnect is not intentional, mark as reconnecting
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect manually
        newSocket.connect();
        setIsReconnecting(true);
      } else if (reason === 'io client disconnect') {
        // Client disconnected intentionally
        setIsReconnecting(false);
      } else {
        // Network error, will auto-reconnect
        setIsReconnecting(true);
      }
    });

    newSocket.on('connect_error', (err: Error) => {
      console.error('Socket connection error:', err);
      setError(err.message);
      setIsReconnecting(true);
    });

    newSocket.on('error', (err: Error) => {
      console.error('Socket error:', err);
      setError(err.message);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
      setIsReconnecting(true);
      setError(null);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed');
      setError('Không thể kết nối đến server. Vui lòng thử lại sau.');
      setIsReconnecting(false);
    });

    socketRef.current = newSocket;

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      newSocket.disconnect();
    };
  }, []);

  const emit = useCallback(<T,>(event: string, data: T) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Cannot emit: socket not connected');
    }
  }, [isConnected]);

  const on = useCallback(<T,>(event: string, handler: (data: T) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event: string) => {
    if (socketRef.current) {
      socketRef.current.off(event);
    }
  }, []);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.connect();
      setIsReconnecting(true);
      setError(null);
    }
  }, []);

  return {
    getSocket: () => socketRef.current,
    isConnected,
    isReconnecting,
    error,
    emit,
    on,
    off,
    reconnect,
  };
}
