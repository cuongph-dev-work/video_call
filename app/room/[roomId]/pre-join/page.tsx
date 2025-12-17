'use client';

import React, { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import { Video, Mic, MicOff, VideoOff, Volume2, User, ShieldCheck, MonitorUp } from 'lucide-react';
import { useLocalStream } from '@/hooks/useLocalStream';
import { displayNameSchema, type DisplayNameFormData } from '@/lib/validations';
import { usePreferencesStore } from '@/store/usePreferencesStore';

export default function PreJoinPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const videoRef = useRef<HTMLVideoElement>(null);

    // React Hook Form setup with Valibot
    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch,
    } = useForm<DisplayNameFormData>({
        resolver: valibotResolver(displayNameSchema),
        mode: 'onChange',
        defaultValues: {
            displayName: '',
        },
    });

    const displayName = watch('displayName');

    const {
        stream: localStream,
        audioEnabled,
        videoEnabled,
        devices,
        selectedMic,
        selectedCamera,
        selectedSpeaker,
        error: streamError,
        toggleAudio,
        toggleVideo,
        switchMicrophone,
        switchCamera,
        switchSpeaker,
    } = useLocalStream();

    // Get displayName from store
    const storedDisplayName = usePreferencesStore(state => state.displayName);
    const setStoredDisplayName = usePreferencesStore(state => state.setDisplayName);

    // Initialize display name from store
    useEffect(() => {
        if (storedDisplayName) {
            setValue('displayName', storedDisplayName);
        }
    }, [storedDisplayName, setValue]);

    const videoInitializedRef = useRef(false);

    // Update video element: once on mount, or when stream object changes (camera switch)
    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
            videoInitializedRef.current = true;
        }
    }, [localStream]); // Re-run when stream object changes (camera switch)

    const onJoinSubmit = (data: DisplayNameFormData) => {
        // Save name to store (which automatically persists to localStorage)
        setStoredDisplayName(data.displayName);

        // Navigate to room
        router.push(`/room/${roomId}`);
    };

    const handlePresentNow = () => {
        if (!displayName.trim() || !!errors.displayName) return;

        const name = displayName.trim();
        // Save to store (which automatically persists to localStorage)
        setStoredDisplayName(name);

        router.push(`/room/${roomId}?share=true`);
    };

    return (
        <div className="min-h-screen flex flex-col text-gray-200 bg-[#0f1115] bg-[radial-gradient(circle_at_15%_50%,_rgba(59,130,246,0.08),_transparent_25%),_radial-gradient(circle_at_85%_30%,_rgba(124,58,237,0.08),_transparent_25%)]">
            {/* Header */}
            <header className="w-full border-b border-white/5 bg-[#0f1115]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center justify-between max-w-[1600px] mx-auto px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Video className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight text-white">VideoCall App</h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-gray-200">{displayName.trim() || 'Khách'}</p>
                        </div>
                        <div className="size-10 rounded-full bg-[#181b21] border border-[#313845] flex items-center justify-center text-blue-500 font-bold overflow-hidden shadow-inner relative group cursor-pointer">
                            <User className="w-5 h-5" />
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full flex items-center justify-center p-4 lg:p-8 overflow-hidden">
                <div className="w-full max-w-[1280px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
                    {/* Video Preview - Left */}
                    <div className="lg:col-span-7 w-full flex flex-col gap-6 order-2 lg:order-1">
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl shadow-black/50 border border-white/10 group ring-1 ring-white/5">
                            {/* Video Stream */}
                            {videoEnabled ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                    style={{ transform: 'scaleX(-1)' }} // Mirror effect
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                                    <div className="text-center">
                                        <VideoOff className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-400">Camera đã tắt</p>
                                    </div>
                                </div>
                            )}

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>

                            {/* Mic Indicator */}
                            {audioEnabled && (
                                <div className="absolute top-5 left-5 flex gap-3">
                                    <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2.5">
                                        <div className="flex items-end gap-1 h-4 w-4 justify-center">
                                            <div className="w-1 bg-green-400 rounded-full h-1 animate-pulse"></div>
                                            <div className="w-1 bg-green-400 rounded-full h-2 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-1 bg-green-400 rounded-full h-3 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Control Bar */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/50 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-xl">
                                <button
                                    onClick={toggleAudio}
                                    className={`group/btn relative flex items-center justify-center size-12 rounded-xl transition-all duration-300 shadow-lg cursor-pointer ${audioEnabled
                                        ? 'bg-white/10 hover:bg-white/20 text-white border border-white/5'
                                        : 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'
                                        }`}
                                    title={audioEnabled ? 'Tắt tiếng' : 'Bật tiếng'}
                                >
                                    {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                                </button>

                                <button
                                    onClick={toggleVideo}
                                    className={`group/btn relative flex items-center justify-center size-12 rounded-xl transition-all duration-300 shadow-lg cursor-pointer ${videoEnabled
                                        ? 'bg-white/10 hover:bg-white/20 text-white border border-white/5'
                                        : 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'
                                        }`}
                                    title="Bật/tắt camera"
                                >
                                    {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {streamError && (
                            <div className="flex justify-center">
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3 max-w-md">
                                    <div className="text-red-500">⚠️</div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-red-400">Lỗi Camera/Microphone</p>
                                        <p className="text-xs text-red-300/80 mt-0.5">{streamError}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Encryption Badge */}
                        <div className="flex justify-center opacity-70">
                            <p className="text-xs text-gray-400 flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                Cuộc gọi này được mã hóa end-to-end
                            </p>
                        </div>
                    </div>

                    {/* Settings Form - Right */}
                    <div className="lg:col-span-5 w-full flex flex-col gap-8 order-1 lg:order-2">
                        <div className="flex flex-col gap-3">
                            <h1 className="text-3xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                                Sẵn sàng <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">tham gia?</span>
                            </h1>
                            <p className="text-gray-400 text-lg font-light">
                                Kiểm tra video và âm thanh trước khi tham gia cuộc họp.
                            </p>
                        </div>

                        <div className="bg-[#181b21]/50 border border-[#313845]/50 rounded-2xl p-6 lg:p-8 backdrop-blur-sm shadow-xl flex flex-col gap-6">
                            {/* Display Name */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">
                                    Tên hiển thị
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        {...register('displayName')}
                                        className={`w-full bg-[#222730] border text-white rounded-xl h-12 pl-12 pr-4 focus:ring-2 transition-all outline-none font-medium placeholder:text-gray-600 shadow-sm ${errors.displayName
                                            ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
                                            : 'border-[#313845] focus:ring-blue-500/50 focus:border-blue-500'
                                            }`}
                                        placeholder="Nhập tên của bạn..."
                                        maxLength={30}
                                    />
                                </div>
                                {/* Error Message */}
                                {errors.displayName && (
                                    <p className="text-sm text-red-400 ml-1 flex items-center gap-1">
                                        <span className="text-xs">⚠️</span>
                                        {errors.displayName.message}
                                    </p>
                                )}
                                {/* Helper Text */}
                                {!errors.displayName && (
                                    <p className="text-xs text-gray-500 ml-1">
                                        2-30 ký tự • Chỉ chữ cái, số và khoảng trắng
                                    </p>
                                )}
                            </div>

                            <div className="h-px bg-white/5 w-full my-1"></div>

                            {/* Device Settings */}
                            <div className="flex flex-col gap-4">
                                <DeviceSelect
                                    label="Microphone"
                                    icon={<Mic className="w-5 h-5" />}
                                    devices={devices.filter(d => d.kind === 'audioinput')}
                                    selectedDeviceId={selectedMic}
                                    onDeviceChange={switchMicrophone}
                                />
                                <DeviceSelect
                                    label="Loa"
                                    icon={<Volume2 className="w-5 h-5" />}
                                    devices={devices.filter(d => d.kind === 'audiooutput')}
                                    selectedDeviceId={selectedSpeaker}
                                    onDeviceChange={(deviceId) => switchSpeaker(deviceId, videoRef.current || undefined)}
                                />
                                <DeviceSelect
                                    label="Camera"
                                    icon={<Video className="w-5 h-5" />}
                                    devices={devices.filter(d => d.kind === 'videoinput')}
                                    selectedDeviceId={selectedCamera}
                                    onDeviceChange={switchCamera}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                {/* Join Button */}
                                <button
                                    onClick={handleSubmit(onJoinSubmit)}
                                    disabled={!displayName.trim() || !!errors.displayName}
                                    className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-2xl shadow-blue-600/30 hover:shadow-blue-600/50 flex items-center justify-center gap-3 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#3b82f6] transform hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <span className="text-lg">Tham Gia Ngay</span>
                                </button>
                                <button
                                    onClick={handlePresentNow}
                                    className="min-w-[150px] sm:w-auto px-6 py-4 flex items-center justify-center gap-2 bg-[#222730] hover:bg-[#313845] border border-[#313845] text-gray-200 rounded-xl font-medium text-base transition-all duration-200 hover:text-white cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <MonitorUp className="w-5 h-5" />
                                    Trình bày
                                </button>
                            </div>
                        </div>

                        {/* Test Link */}
                        <div className="flex justify-center sm:justify-start px-2 h-5">
                            {/* TODO */}
                            {/* <button className="text-sm text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-2 group">
                                <Settings className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                Kiểm tra âm thanh và video của bạn
                            </button> */}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Device Select Component
interface DeviceSelectProps {
    label: string;
    icon: React.ReactNode;
    devices: MediaDeviceInfo[];
    selectedDeviceId: string;
    onDeviceChange: (deviceId: string) => void;
}

const DeviceSelect: React.FC<DeviceSelectProps> = ({ label, icon, devices, selectedDeviceId, onDeviceChange }) => {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
                {label}
            </label>
            <div className="relative group">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors">
                    {icon}
                </span>
                <select
                    value={selectedDeviceId}
                    onChange={(e) => onDeviceChange(e.target.value)}
                    className="w-full appearance-none bg-[#222730] border border-[#313845] text-gray-200 rounded-xl h-11 pl-11 pr-10 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none cursor-pointer transition-all hover:border-gray-600"
                >
                    {devices.length === 0 ? (
                        <option value="">Không tìm thấy {label.toLowerCase()}</option>
                    ) : (
                        devices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `${label} ${device.deviceId.slice(0, 8)}`}
                            </option>
                        ))
                    )}
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                    ▼
                </span>
            </div>
        </div>
    );
};
