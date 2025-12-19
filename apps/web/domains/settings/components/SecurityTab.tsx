'use client';

import React, { useState, useEffect } from 'react';
import { Lock, Key, Copy, RefreshCw, MessageSquare, Monitor, Mic, Video } from 'lucide-react';
import type { RoomSettingsState, RoomPermissions } from '@video-call/types';

interface SecurityTabProps {
    roomId: string;
    settings: RoomSettingsState;
    permissions: RoomPermissions;
    isHost: boolean;
    isLoading: boolean;
    updateSettings: (updates: Partial<RoomSettingsState>) => void;
    updatePermission: (key: keyof RoomPermissions, value: boolean) => void;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({
    roomId,
    settings,
    permissions,
    isHost,
    isLoading,
    updateSettings,
    updatePermission,
}) => {
    const [password, setPassword] = useState('meet-secure-8829');
    const [copied, setCopied] = useState(false);

    const handleTogglePassword = (checked: boolean) => {
        updateSettings({ requirePassword: checked });
    };


    const handleCopyPassword = () => {
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleGeneratePassword = () => {
        const newPassword = 'meet-' + Math.random().toString(36).substring(2, 10);
        setPassword(newPassword);
    };

    return (
        <div className="space-y-6">
            {/* Password Requirement */}
            <div className="p-4 rounded-xl bg-[#2a3042]/40 border border-[#2e3445] hover:border-blue-500/30 transition-colors">
                <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-500 shrink-0">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">Yêu cầu mật khẩu</h3>
                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                                Người tham gia mới cần nhập mật khẩu để vào phòng.
                            </p>
                        </div>
                    </div>
                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.requirePassword ?? false}
                            onChange={(e) => handleTogglePassword(e.target.checked)}
                            disabled={!isHost}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#2a3042] peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {/* Password Input */}
                {settings.requirePassword && (
                    <div className="mt-4 pl-[52px]">
                        <div className="flex items-center gap-2 p-1.5 pr-2 bg-[#0f111a]/50 border border-[#2e3445] rounded-lg w-full max-w-sm group focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
                            <Key className="w-4 h-4 text-gray-500 ml-2" />
                            <input
                                className="bg-transparent border-none text-sm text-white w-full focus:ring-0 px-2 font-mono tracking-wide"
                                readOnly
                                type="text"
                                value={password}
                            />
                            <button
                                onClick={handleCopyPassword}
                                className="p-1.5 rounded hover:bg-[#2a3042] text-gray-400 hover:text-white transition-colors"
                                title="Copy"
                            >
                                {copied ? (
                                    <span className="text-green-500 text-xs">✓</span>
                                ) : (
                                    <Copy className="w-4 h-4" />
                                )}
                            </button>
                            <button
                                onClick={handleGeneratePassword}
                                className="p-1.5 rounded hover:bg-[#2a3042] text-gray-400 hover:text-white transition-colors"
                                title="Generate New"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="h-px bg-[#2e3445] w-full my-6"></div>

            {/* Permissions Section */}
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider opacity-80">
                    Quyền hạn thành viên
                </h2>
                <button className="text-xs font-medium text-blue-500 hover:text-blue-400 transition-colors">
                    Khôi phục mặc định
                </button>
            </div>

            <PermissionsList
                permissions={permissions}
                isHost={isHost}
                updatePermission={updatePermission}
            />
        </div>
    );
};

// Permissions List Component
interface PermissionsListProps {
    permissions: RoomPermissions;
    isHost: boolean;
    updatePermission: (key: keyof RoomPermissions, value: boolean) => void;
}

const PermissionsList: React.FC<PermissionsListProps> = ({
    permissions,
    isHost,
    updatePermission,
}) => {
    const togglePermission = (key: keyof RoomPermissions) => {
        updatePermission(key, !permissions[key]);
    };

    return (
        <div className="grid gap-3">
            <PermissionItem
                icon={<MessageSquare className="w-4 h-4" />}
                label="Gửi tin nhắn chat"
                checked={permissions.allowChat ?? true}
                onChange={() => togglePermission('allowChat')}
                disabled={!isHost}
            />
            <PermissionItem
                icon={<Monitor className="w-4 h-4" />}
                label="Chia sẻ màn hình"
                checked={permissions.allowScreenShare ?? true}
                onChange={() => togglePermission('allowScreenShare')}
                disabled={!isHost}
            />
            <PermissionItem
                icon={<Mic className="w-4 h-4" />}
                label="Bật microphone"
                checked={permissions.allowMicrophone ?? true}
                onChange={() => togglePermission('allowMicrophone')}
                disabled={!isHost}
            />
            <PermissionItem
                icon={<Video className="w-4 h-4" />}
                label="Bật camera"
                checked={permissions.allowCamera ?? true}
                onChange={() => togglePermission('allowCamera')}
                disabled={!isHost}
            />
        </div>
    );
};

// Permission Item Component
interface PermissionItemProps {
    icon: React.ReactNode;
    label: string;
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
}

const PermissionItem: React.FC<PermissionItemProps> = ({ icon, label, checked, onChange, disabled = false }) => (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-[#2a3042]/30 transition-colors group">
        <div className="flex items-center gap-3">
            <div className="text-gray-400 group-hover:text-blue-400 transition-colors">
                {icon}
            </div>
            <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#2a3042] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
        </label>
    </div>
);
