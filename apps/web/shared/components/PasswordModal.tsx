'use client';

import { useState } from 'react';
import { Lock, X } from 'lucide-react';

interface PasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (password: string) => void;
    error?: string;
    isValidating?: boolean;
}

export function PasswordModal({
    isOpen,
    onClose,
    onSubmit,
    error,
    isValidating = false,
}: PasswordModalProps) {
    const [password, setPassword] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password.trim()) {
            onSubmit(password);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#181b21] border border-[#313845] rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Phòng họp có mật khẩu</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit}>
                    <p className="text-gray-400 text-sm mb-4">
                        Phòng họp này được bảo vệ bằng mật khẩu. Vui lòng nhập mật khẩu để tham gia.
                    </p>

                    {/* Password Input */}
                    <div className="mb-4">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1 block mb-2">
                            Mật khẩu
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#222730] border border-[#313845] text-white rounded-xl h-12 px-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none font-medium placeholder:text-gray-600"
                            placeholder="Nhập mật khẩu..."
                            autoFocus
                            disabled={isValidating}
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-sm text-red-400 flex items-center gap-2">
                                <span>⚠️</span>
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-[#222730] hover:bg-[#313845] border border-[#313845] text-gray-200 rounded-xl font-medium transition-all"
                            disabled={isValidating}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={!password.trim() || isValidating}
                            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20"
                        >
                            {isValidating ? 'Đang kiểm tra...' : 'Tham gia'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
