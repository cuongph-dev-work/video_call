'use client';

import { Camera, Mic, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface PermissionDeniedProps {
  type: 'camera' | 'microphone' | 'both';
  onRetry?: () => void;
}

export function PermissionDenied({ type, onRetry }: PermissionDeniedProps) {
  const getMessage = () => {
    if (type === 'camera') return 'Quyền truy cập camera bị từ chối';
    if (type === 'microphone') return 'Quyền truy cập microphone bị từ chối';
    return 'Quyền truy cập camera và microphone bị từ chối';
  };

  const getIcon = () => {
    if (type === 'camera') return <Camera className="w-12 h-12" />;
    if (type === 'microphone') return <Mic className="w-12 h-12" />;
    return <AlertTriangle className="w-12 h-12" />;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
      <div className="text-gray-400 dark:text-gray-500 mb-4">
        {getIcon()}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {getMessage()}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4 max-w-md">
        Vui lòng cấp quyền truy cập trong cài đặt trình duyệt để sử dụng tính năng video call.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Thử lại
        </Button>
      )}
    </div>
  );
}

