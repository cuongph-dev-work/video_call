'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';

interface RejectionModalProps {
    isOpen: boolean;
    message?: string;
    onClose?: () => void;
}

export const RejectionModal: React.FC<RejectionModalProps> = ({
    isOpen,
    message = 'Bạn đã bị từ chối tham gia phòng họp này.',
    onClose
}) => {
    const router = useRouter();
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        if (!isOpen) return;

        // Countdown timer
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push('/');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, router]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-[#1e2230] border border-orange-500/30 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Icon */}
                <div className="flex justify-center pt-8">
                    <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-orange-500" />
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 text-center">
                    <h2 className="text-xl font-bold text-white mb-2">
                        Truy cập bị từ chối
                    </h2>
                    <p className="text-gray-400 text-sm mb-6">
                        {message}
                        <br />
                        Bạn sẽ được chuyển về trang chủ sau {countdown} giây...
                    </p>

                    {/* Countdown Circle */}
                    <div className="flex justify-center mb-4">
                        <div className="relative w-20 h-20">
                            <svg className="w-20 h-20 transform -rotate-90">
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    className="text-gray-700"
                                />
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="36"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 36}`}
                                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - countdown / 3)}`}
                                    className="text-orange-500 transition-all duration-1000"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-bold text-white">{countdown}</span>
                            </div>
                        </div>
                    </div>

                    {/* Button */}
                    <button
                        onClick={() => router.push('/')}
                        className="w-full px-6 py-3 rounded-lg text-sm font-medium text-white bg-orange-600 hover:bg-orange-500 transition-all"
                    >
                        Quay về trang chủ ngay
                    </button>
                </div>
            </div>
        </div>
    );
};
