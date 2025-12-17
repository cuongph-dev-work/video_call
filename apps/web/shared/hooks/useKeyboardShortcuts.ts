'use client';

import { useEffect } from 'react';

interface KeyboardShortcutsConfig {
  onToggleMic?: () => void;
  onToggleVideo?: () => void;
  onToggleScreenShare?: () => void;
  onToggleRecording?: () => void;
  onEndCall?: () => void;
  onShowHelp?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  onEndCall,
  onShowHelp,
  enabled = true,
}: KeyboardShortcutsConfig) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case ' ': // Space - Toggle mic
          e.preventDefault();
          onToggleMic?.();
          break;
        case 'v': // V - Toggle video
          e.preventDefault();
          onToggleVideo?.();
          break;
        case 's': // S - Toggle screen share
          e.preventDefault();
          onToggleScreenShare?.();
          break;
        case 'r': // R - Toggle recording
          e.preventDefault();
          onToggleRecording?.();
          break;
        case 'e': // E - End call (with confirmation)
          e.preventDefault();
          if (confirm('Bạn có chắc muốn kết thúc cuộc gọi?')) {
            onEndCall?.();
          }
          break;
        case '?': // ? - Show/hide help
          e.preventDefault();
          onShowHelp?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [enabled, onToggleMic, onToggleVideo, onToggleScreenShare, onToggleRecording, onEndCall, onShowHelp]);
}
