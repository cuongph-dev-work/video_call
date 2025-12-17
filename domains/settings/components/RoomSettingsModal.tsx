'use client';

import React, { useState } from 'react';
import { X, Shield, Users, Mic } from 'lucide-react';
import { SecurityTab } from './SecurityTab';
import { MediaTab } from './MediaTab';

interface RoomSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomId: string;
}

type TabType = 'security' | 'participants' | 'media';

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
    isOpen,
    onClose,
    roomId,
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('security');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl h-[85vh] md:h-auto md:max-h-[85vh] flex flex-col bg-[#1e2230] border border-[#2e3445] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#2e3445]">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-500" />
                            Cài đặt phòng
                        </h1>
                        <p className="text-xs text-gray-400 mt-1">Quản lý bảo mật và quyền truy cập</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="group flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#2a3042] transition-all text-gray-400 hover:text-white"
                    >
                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs - Desktop */}
                    <div className="w-1/4 min-w-[160px] bg-[#1e2230]/50 border-r border-[#2e3445] py-4 hidden sm:flex flex-col gap-1 px-3">
                        <TabButton
                            icon={<Shield className="w-4 h-4" />}
                            label="Bảo mật"
                            active={activeTab === 'security'}
                            onClick={() => setActiveTab('security')}
                        />
                        <TabButton
                            icon={<Users className="w-4 h-4" />}
                            label="Tham gia"
                            active={activeTab === 'participants'}
                            onClick={() => setActiveTab('participants')}
                        />
                        <TabButton
                            icon={<Mic className="w-4 h-4" />}
                            label="Media"
                            active={activeTab === 'media'}
                            onClick={() => setActiveTab('media')}
                        />
                    </div>

                    {/* Mobile Tabs */}
                    <div className="sm:hidden w-full border-b border-[#2e3445] flex overflow-x-auto gap-4 px-4">
                        <MobileTab label="Bảo mật" active={activeTab === 'security'} onClick={() => setActiveTab('security')} />
                        <MobileTab label="Tham gia" active={activeTab === 'participants'} onClick={() => setActiveTab('participants')} />
                        <MobileTab label="Media" active={activeTab === 'media'} onClick={() => setActiveTab('media')} />
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {activeTab === 'security' && <SecurityTab roomId={roomId} />}
                        {activeTab === 'participants' && <ParticipantsTab />}
                        {activeTab === 'media' && <MediaTab />}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#2e3445] bg-[#1e2230]/90 backdrop-blur rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-[#2a3042] transition-all"
                    >
                        Hủy bỏ
                    </button>
                    <button className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/30 transition-all">
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
};

// Tab Button Component
interface TabButtonProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
            ? 'bg-blue-600/10 text-blue-500 font-semibold'
            : 'text-gray-400 hover:bg-[#2a3042] hover:text-white'
            }`}
    >
        {icon}
        {label}
    </button>
);

// Mobile Tab Component
interface MobileTabProps {
    label: string;
    active: boolean;
    onClick: () => void;
}

const MobileTab: React.FC<MobileTabProps> = ({ label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`whitespace-nowrap py-3 text-sm font-medium border-b-2 transition-colors ${active ? 'text-blue-500 border-blue-500' : 'text-gray-400 border-transparent'
            }`}
    >
        {label}
    </button>
);

// Placeholder tab components
const ParticipantsTab: React.FC = () => (
    <div className="text-gray-400">Participants tab content</div>
);
