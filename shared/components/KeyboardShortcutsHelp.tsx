'use client';

import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcut {
    key: string;
    description: string;
}

const shortcuts: KeyboardShortcut[] = [
    { key: 'Space', description: 'Bật/tắt micro' },
    { key: 'V', description: 'Bật/tắt camera' },
    { key: 'S', description: 'Chia sẻ màn hình' },
    { key: 'R', description: 'Bật/tắt ghi hình' },
    { key: 'E', description: 'Kết thúc cuộc gọi' },
    { key: '?', description: 'Hiện/ẩn phím tắt' },
];

interface KeyboardShortcutsHelpProps {
    isOpen: boolean;
    onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
    isOpen,
    onClose,
}) => {
    // Handle Escape key to close
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#1a1d24] border border-[#2a2f3a] rounded-2xl max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[#2a2f3a]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
                            <Keyboard className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Phím tắt</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                        aria-label="Đóng"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Shortcuts List */}
                <div className="p-6 space-y-3">
                    {shortcuts.map((shortcut, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between py-3 px-4 bg-[#13161f]/50 rounded-xl hover:bg-[#13161f] transition-colors"
                        >
                            <span className="text-gray-300 text-sm">{shortcut.description}</span>
                            <kbd className="px-3 py-1.5 bg-[#2c303f] border border-[#3a3f4f] rounded-lg text-white text-sm font-mono font-semibold shadow-sm min-w-[60px] text-center">
                                {shortcut.key}
                            </kbd>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[#2a2f3a] bg-[#13161f]/30">
                    <p className="text-xs text-gray-500 text-center">
                        Nhấn <kbd className="px-2 py-0.5 bg-[#2c303f] rounded text-white font-mono">?</kbd> hoặc <kbd className="px-2 py-0.5 bg-[#2c303f] rounded text-white font-mono">Esc</kbd> để đóng
                    </p>
                </div>
            </div>
        </div>
    );
};
