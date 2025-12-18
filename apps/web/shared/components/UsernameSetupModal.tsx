'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { User, CheckCircle2 } from 'lucide-react';
import { usernameSchema, type UsernameFormData } from '@/shared/lib/validations';
import { usePreferencesStore } from '@/shared/stores/usePreferencesStore';

const emptySubscribe = () => () => { };

export function UsernameSetupModal() {
    const isClient = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false
    );
    const { displayName, setDisplayName } = usePreferencesStore();
    const [isSubmitted, setIsSubmitted] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isValid, isDirty },
        setValue,
    } = useForm<UsernameFormData>({
        resolver: valibotResolver(usernameSchema),
        mode: 'onChange',
        defaultValues: {
            username: displayName || '',
        },
    });

    // Modal is open if on client and displayName is missing and not just submitted
    const isOpen = isClient && !displayName && !isSubmitted;

    // Synchronize form when client-side data is available
    useEffect(() => {
        if (isClient && displayName) {
            setValue('username', displayName);
        }
    }, [isClient, displayName, setValue]);

    const onSubmit = (data: UsernameFormData) => {
        setIsSubmitted(true);
        setDisplayName(data.username);
    };

    const handleGoogleLogin = () => {
        alert('Google login chưa được thiết lập');
    };

    // Don't render anything on server or if already has username
    if (!isClient || !isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-[#0b0e11]/80 backdrop-blur-sm transition-opacity duration-300"></div>

            {/* Modal */}
            <div className="relative w-full max-w-md bg-[#161b22] border border-[#232936] rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up ring-1 ring-white/5">
                {/* Top gradient border */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#3b82f6] via-purple-500 to-[#3b82f6]"></div>

                {/* Glow effect */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#3b82f6]/20 rounded-full blur-[80px] pointer-events-none"></div>

                {/* Content */}
                <div className="p-8 relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1f2937] text-[#3b82f6] mb-5 shadow-inner ring-1 ring-white/5 group">
                            <User className="w-7 h-7 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Xin chào!</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Vui lòng nhập tên hiển thị của bạn hoặc đăng nhập để tham gia cuộc họp.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
                                Tên hiển thị (Guest)
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="w-5 h-5 text-gray-500 group-focus-within:text-[#3b82f6] transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    {...register('username')}
                                    className={`w-full bg-[#1f2937] border rounded-xl pl-10 pr-10 py-3.5 text-white placeholder-gray-500 focus:ring-2 outline-none transition-all shadow-sm ${errors.username
                                        ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
                                        : 'border-[#232936] focus:ring-[#3b82f6] focus:border-transparent'
                                        }`}
                                    placeholder="Nhập tên của bạn..."
                                    autoFocus
                                    maxLength={30}
                                />
                                {isValid && isDirty && !errors.username && (
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </div>
                                )}
                            </div>

                            {/* Error Message */}
                            {errors.username && (
                                <p className="mt-2 text-sm text-red-400 flex items-center gap-1 ml-1">
                                    {errors.username.message}
                                </p>
                            )}

                            {/* Helper Text */}
                            {!errors.username && (
                                <p className="mt-2 text-xs text-gray-500 ml-1">
                                    2-30 ký tự • Chỉ chữ cái, số và khoảng trắng
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={!isValid || !isDirty}
                            className="w-full py-3.5 px-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-xl shadow-lg shadow-[#3b82f6]/25 hover:shadow-[#3b82f6]/40 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#3b82f6]"
                        >
                            <span>Tham gia ngay</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-7">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#232936]"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase font-medium">
                            <span className="bg-[#161b22] px-3 text-gray-500">Hoặc tiếp tục với</span>
                        </div>
                    </div>

                    {/* Google Login Button */}
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full py-3.5 px-4 bg-white hover:bg-gray-100 text-gray-900 font-medium rounded-xl transition-colors flex items-center justify-center gap-3 transform active:scale-[0.98] group"
                    >
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </button>
                </div>
            </div>
        </div>
    );
}
