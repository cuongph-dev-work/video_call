'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
  error?: string;
}

export function ConnectionStatus({
  isConnected,
  isReconnecting = false,
  error,
}: ConnectionStatusProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isConnected || error) {
      setShow(true);
    } else {
      // Hide after 2 seconds when connected
      const timer = setTimeout(() => setShow(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, error]);

  if (!show) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
      <div
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg
          ${
            isConnected
              ? 'bg-green-500 text-white'
              : isReconnecting
              ? 'bg-yellow-500 text-white'
              : 'bg-red-500 text-white'
          }
        `}
      >
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Đã kết nối</span>
          </>
        ) : isReconnecting ? (
          <>
            <WifiOff className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-medium">Đang kết nối lại...</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {error || 'Mất kết nối'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

