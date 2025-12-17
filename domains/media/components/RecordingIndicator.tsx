'use client';

import { Circle } from 'lucide-react';

interface RecordingIndicatorProps {
  duration: number;
  formatDuration: () => string;
}

export function RecordingIndicator({ duration, formatDuration }: RecordingIndicatorProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg">
      <Circle className="w-3 h-3 fill-current animate-pulse" />
      <span className="text-sm font-medium">Đang ghi</span>
      <span className="text-sm font-mono">{formatDuration()}</span>
    </div>
  );
}

