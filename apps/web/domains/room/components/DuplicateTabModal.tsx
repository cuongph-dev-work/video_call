import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DuplicateTabModalProps {
    onClose: () => void;
}

export const DuplicateTabModal: React.FC<DuplicateTabModalProps> = ({ onClose }) => {
    const [showManualInstruction, setShowManualInstruction] = useState(false);

    const handleCloseTab = () => {
        // Try to close the tab
        window.close();

        // Check if tab is still open after 100ms
        setTimeout(() => {
            // If we're still here, window.close() failed
            setShowManualInstruction(true);
        }, 100);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-gray-700/50 shadow-2xl max-w-md w-full p-8">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white text-center mb-3">Phòng Đã Được Mở</h2>

                {/* Message */}
                <p className="text-gray-300 text-center mb-2">
                    Bạn đã mở phòng này ở tab hoặc cửa sổ khác rồi.
                </p>
                <p className="text-gray-400 text-sm text-center mb-8">
                    Vui lòng đóng tab này hoặc sử dụng tab hiện có để tránh xung đột.
                </p>

                {/* Manual instruction if window.close() failed */}
                {showManualInstruction && (
                    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <div className="flex items-start gap-3">
                            <X className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-yellow-200 font-medium mb-1">
                                    Không thể tự động đóng tab
                                </p>
                                <p className="text-xs text-yellow-300/80">
                                    Vui lòng nhấn <kbd className="px-1.5 py-0.5 bg-yellow-500/20 rounded text-yellow-200 font-mono">Ctrl+W</kbd> (Windows/Linux) hoặc <kbd className="px-1.5 py-0.5 bg-yellow-500/20 rounded text-yellow-200 font-mono">⌘+W</kbd> (Mac) để đóng tab này.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    {!showManualInstruction && (
                        <button
                            onClick={handleCloseTab}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                        >
                            Đóng Tab Này
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className={`${showManualInstruction ? 'w-full' : 'flex-1'} px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors`}
                    >
                        Về Trang Chủ
                    </button>
                </div>
            </div>
        </div>
    );
};
