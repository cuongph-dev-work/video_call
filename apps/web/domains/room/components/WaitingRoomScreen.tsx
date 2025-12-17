import React from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface WaitingRoomScreenProps {
    displayName: string;
    roomId: string;
    onLeave: () => void;
}

export const WaitingRoomScreen: React.FC<WaitingRoomScreenProps> = ({
    displayName,
    roomId,
    onLeave,
}) => {
    return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-[#13161f] text-white p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="max-w-md w-full bg-[#1e2230] border border-[#2e3445] rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-300 relative z-10">
                {/* Header */}
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Đang chờ chủ phòng duyệt</h2>
                <p className="text-gray-400 mb-6">
                    Vui lòng đợi giây lát...
                </p>

                {/* Animated Dots */}
                <div className="flex justify-center gap-2 mb-8">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>

                {/* User Info */}
                <div className="w-full space-y-3 mb-8">
                    <div className="flex items-center gap-3 p-3 bg-[#2a3042] rounded-lg border border-[#3e4459]">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-medium text-white">{displayName}</p>
                            <p className="text-xs text-gray-400">Tham gia với tên</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-[#2a3042] rounded-lg border border-[#3e4459]">
                        <ShieldAlert className="w-5 h-5 text-gray-400 shrink-0 ml-2.5" />
                        <div className="text-left">
                            <p className="text-sm font-medium text-white">Phòng: {roomId}</p>
                            <p className="text-xs text-gray-400">Mã cuộc họp</p>
                        </div>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    onClick={onLeave}
                    className="w-full text-gray-400 hover:text-white hover:bg-[#2a3042] gap-2"
                >
                    Rời khỏi phòng chờ
                </Button>
            </div>
        </div>
    );
};
