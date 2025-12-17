'use client';

import React, { useState } from 'react';
import { Users, UserPlus, UserCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface Participant {
    id: string;
    displayName: string;
    avatar?: string;
    role?: string;
}

interface ParticipantsTabProps {
    participants?: Participant[];
}

export const ParticipantsTab: React.FC<ParticipantsTabProps> = ({ participants = [] }) => {
    const [allowJoinBeforeHost, setAllowJoinBeforeHost] = useState(false);

    return (
        <div className="space-y-6">
            {/* Join Settings Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Cài đặt tham gia
                </h3>

                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-[#222730] transition-colors group border border-transparent hover:border-[#313845]">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <label
                                className="text-sm font-medium text-gray-200 cursor-pointer"
                                onClick={() => setAllowJoinBeforeHost(!allowJoinBeforeHost)}
                            >
                                Cho phép tham gia trước chủ phòng
                            </label>
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wide border border-blue-500/20">
                                New
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Người tham gia có thể vào phòng họp ngay cả khi chủ phòng chưa có mặt.
                        </p>
                    </div>
                    <button
                        onClick={() => setAllowJoinBeforeHost(!allowJoinBeforeHost)}
                        className={cn(
                            "relative w-11 h-6 rounded-full transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50",
                            allowJoinBeforeHost ? 'bg-blue-600' : 'bg-[#313845]'
                        )}
                    >
                        <span
                            className={cn(
                                "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300",
                                allowJoinBeforeHost ? 'translate-x-5' : 'translate-x-0'
                            )}
                        />
                    </button>
                </div>
            </div>

            <div className="h-px bg-white/10 my-4"></div>

            {/* Participants List Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Danh sách thành viên ({participants.length})
                    </h3>
                </div>

                <div className="bg-[#15171e] rounded-xl border border-[#313845] overflow-hidden max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    {participants.length === 0 ? (
                        <div className="p-8 flex flex-col items-center justify-center text-gray-500 gap-2">
                            <Users className="w-8 h-8 opacity-50" />
                            <p className="text-sm">Chưa có thành viên nào</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {participants.map((participant) => (
                                <div key={participant.id} className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors">
                                    {/* Avatar */}
                                    <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-inner">
                                        {participant.displayName.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-gray-200 truncate">
                                                {participant.displayName}
                                            </p>
                                            {/* Role Indicators - Mock logic for now */}
                                            {participant.id === 'local' || participant.displayName.includes('(You)') ? (
                                                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/20">
                                                    Bạn
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    {/* Status Icon */}
                                    <UserCheck className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3">
                    <ShieldAlert className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-yellow-500">
                            Lưu ý quản trị viên
                        </p>
                        <p className="text-xs text-yellow-500/80">
                            Bạn có thể xóa hoặc tắt tiếng người tham gia trực tiếp từ danh sách này trong các bản cập nhật sau.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
