'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function ConnectionStatus({
  isConnected,
  isReconnecting = false,
  error,
  onRetry,
}: ConnectionStatusProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isConnected || error) {
      // Use setTimeout to avoid setState in effect
      const timer = setTimeout(() => setShow(true), 0);
      return () => clearTimeout(timer);
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
          flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
          ${isConnected
            ? 'bg-green-500 text-white'
            : isReconnecting
              ? 'bg-yellow-500 text-white'
              : 'bg-red-500 text-white'
          }
        `}
      >
        {isConnected ? (
          <>
            <Wifi className="w-5 h-5" />
            <span className="text-sm font-medium">Đã kết nối</span>
          </>
        ) : isReconnecting ? (
          <>
            <WifiOff className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">Đang kết nối lại...</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5" />
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {error || 'Mất kết nối'}
              </span>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md text-xs font-semibold transition-colors"
                >
                  Thử lại
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

