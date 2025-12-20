'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { io, Socket } from 'socket.io-client';

// ============================================================================
// Types
// ============================================================================

interface SocketState {
  isConnected: boolean;
  isReconnecting: boolean;
  error: string | null;
}

interface UseSocketReturn {
  getSocket: () => Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  error: string | null;
  emit: <T>(event: string, data: T) => void;
  on: <T>(event: string, handler: (data: T) => void) => void;
  off: (event: string, handler?: (...args: unknown[]) => void) => void;
  reconnect: () => void;
}

// ============================================================================
// Socket Singleton Manager (Module-level, outside React lifecycle)
// ============================================================================

const INITIAL_STATE: SocketState = {
  isConnected: false,
  isReconnecting: false,
  error: null,
};

let socketInstance: Socket | null = null;
let socketState: SocketState = { ...INITIAL_STATE };
const listeners = new Set<() => void>();

function updateState(partial: Partial<SocketState>) {
  socketState = { ...socketState, ...partial };
  listeners.forEach((listener) => listener());
}

function getSocketInstance(): Socket {
  if (socketInstance) {
    return socketInstance;
  }

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

  socketInstance = io(wsUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 20000,
  });

  socketInstance.on('connect', () => {
    updateState({ isConnected: true, isReconnecting: false, error: null });
  });

  socketInstance.on('disconnect', (reason) => {
    const isReconnecting = reason !== 'io client disconnect';
    if (reason === 'io server disconnect') {
      socketInstance?.connect();
    }
    updateState({ isConnected: false, isReconnecting });
  });

  socketInstance.on('connect_error', (err: Error) => {
    updateState({ error: err.message, isReconnecting: true });
  });

  socketInstance.on('error', (err: Error) => {
    updateState({ error: err.message });
  });

  socketInstance.on('reconnect_attempt', () => {
    updateState({ isReconnecting: true, error: null });
  });

  socketInstance.on('reconnect_failed', () => {
    updateState({
      error: 'Không thể kết nối đến server. Vui lòng thử lại sau.',
      isReconnecting: false,
    });
  });

  return socketInstance;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  getSocketInstance(); // Ensure socket is initialized
  return () => listeners.delete(callback);
}

function getSnapshot(): SocketState {
  return socketState;
}

function getServerSnapshot(): SocketState {
  return INITIAL_STATE;
}

// ============================================================================
// React Hook
// ============================================================================

export function useSocket(): UseSocketReturn {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const getSocket = useCallback(() => socketInstance, []);

  const emit = useCallback(
    <T,>(event: string, data: T) => {
      if (socketInstance?.connected) {
        socketInstance.emit(event, data);
      }
    },
    []
  );

  const on = useCallback(<T,>(event: string, handler: (data: T) => void) => {
    getSocketInstance().on(event, handler as (...args: unknown[]) => void);
  }, []);

  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    if (handler) {
      socketInstance?.off(event, handler);
    } else {
      socketInstance?.off(event);
    }
  }, []);

  const reconnect = useCallback(() => {
    getSocketInstance().connect();
    updateState({ isReconnecting: true, error: null });
  }, []);

  return {
    getSocket,
    isConnected: state.isConnected,
    isReconnecting: state.isReconnecting,
    error: state.error,
    emit,
    on,
    off,
    reconnect,
  };
}
