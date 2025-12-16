'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Video, Mic, MicOff, VideoOff, Settings, Volume2, User, Sparkles, ShieldCheck, MonitorUp } from 'lucide-react';
import { useLocalStream } from '@/hooks/useLocalStream';

export default function PreJoinPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = params.roomId as string;
    const videoRef = useRef<HTMLVideoElement>(null);

    const [displayName, setDisplayName] = useState('');

    const {
        stream: localStream,
        audioEnabled,
        videoEnabled,
        toggleAudio,
        toggleVideo
    } = useLocalStream();

    // Initialize display name from localStorage
    useEffect(() => {
        const savedName = localStorage.getItem('displayName') || `User ${Math.floor(Math.random() * 1000)}`;
        setDisplayName(savedName);
    }, []);

    // Update video element when stream changes
    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    const handleJoin = () => {
        // Save name to localStorage
        localStorage.setItem('displayName', displayName);

        // Navigate to room
        router.push(`/room/${roomId}`);
    };

    const handlePresentNow = () => {
        localStorage.setItem('displayName', displayName);
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
                            <p className="text-sm font-medium text-gray-200">Guest User</p>
                            <p className="text-xs text-gray-500">Free Account</p>
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
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    style={{ transform: 'scaleX(-1)' }} // Mirror effect
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                                    <div className="text-center">
                                        <VideoOff className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-400">Camera is off</p>
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
                                        <span className="text-xs font-semibold text-white tracking-wide">Mic active</span>
                                    </div>
                                </div>
                            )}

                            {/* Mirror Badge */}
                            <div className="absolute top-5 right-5">
                                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 flex items-center gap-1.5">
                                    <span>🔄</span>
                                    Mirrored
                                </div>
                            </div>

                            {/* Control Bar */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/50 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-xl">
                                <button
                                    onClick={toggleAudio}
                                    className={`group/btn relative flex items-center justify-center size-12 rounded-xl transition-all duration-300 shadow-lg ${audioEnabled
                                        ? 'bg-white/10 hover:bg-white/20 text-white border border-white/5'
                                        : 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/20'
                                        }`}
                                    title={audioEnabled ? 'Mute' : 'Unmute'}
                                >
                                    {audioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                                </button>

                                <button
                                    onClick={toggleVideo}
                                    className="group/btn relative flex items-center justify-center size-12 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/5 backdrop-blur-md transition-all duration-300"
                                    title="Toggle camera"
                                >
                                    {videoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                                </button>

                                <button
                                    className="group/btn relative flex items-center justify-center size-12 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/5 backdrop-blur-md transition-all duration-300"
                                    title="Effects"
                                >
                                    <Sparkles className="w-6 h-6" />
                                    <span className="absolute top-2 right-2 size-2 bg-blue-500 rounded-full border border-black/50 shadow-sm"></span>
                                </button>

                                <div className="w-px h-6 bg-white/10 mx-1"></div>

                                <button
                                    className="group/btn relative flex items-center justify-center size-12 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/5 backdrop-blur-md transition-all duration-300"
                                    title="Settings"
                                >
                                    <Settings className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Encryption Badge */}
                        <div className="flex justify-center opacity-70">
                            <p className="text-xs text-gray-400 flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                This call is end-to-end encrypted
                            </p>
                        </div>
                    </div>

                    {/* Settings Form - Right */}
                    <div className="lg:col-span-5 w-full flex flex-col gap-8 order-1 lg:order-2">
                        <div className="flex flex-col gap-3">
                            <h1 className="text-3xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                                Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">join?</span>
                            </h1>
                            <p className="text-gray-400 text-lg font-light">
                                Check your video and audio before joining the meeting.
                            </p>
                        </div>

                        <div className="bg-[#181b21]/50 border border-[#313845]/50 rounded-2xl p-6 lg:p-8 backdrop-blur-sm shadow-xl flex flex-col gap-6">
                            {/* Display Name */}
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">
                                    Display Name
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full bg-[#222730] border border-[#313845] text-white rounded-xl h-12 pl-12 pr-4 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none font-medium placeholder:text-gray-600 shadow-sm"
                                        placeholder="Enter your name..."
                                    />
                                </div>
                            </div>

                            <div className="h-px bg-white/5 w-full my-1"></div>

                            {/* Device Settings */}
                            <div className="flex flex-col gap-4">
                                <DeviceSelect
                                    label="Microphone"
                                    icon={<Mic className="w-5 h-5" />}
                                    options={['Default - MacBook Pro Microphone', 'External USB Microphone']}
                                />
                                <DeviceSelect
                                    label="Speaker"
                                    icon={<Volume2 className="w-5 h-5" />}
                                    options={['Default - MacBook Pro Speakers', 'Bluetooth Headphones']}
                                />
                                <DeviceSelect
                                    label="Camera"
                                    icon={<Video className="w-5 h-5" />}
                                    options={['FaceTime HD Camera', 'Logitech C920']}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                <button
                                    onClick={handleJoin}
                                    className="flex-1 h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform active:scale-[0.98]"
                                >
                                    Join Now
                                </button>
                                <button
                                    onClick={handlePresentNow}
                                    className="sm:w-auto px-6 h-12 flex items-center justify-center gap-2 bg-[#222730] hover:bg-[#313845] border border-[#313845] text-gray-200 rounded-xl font-medium text-base transition-colors hover:text-white"
                                >
                                    <MonitorUp className="w-5 h-5" />
                                    Present
                                </button>
                            </div>
                        </div>

                        {/* Test Link */}
                        <div className="flex justify-center sm:justify-start px-2">
                            <button className="text-sm text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-2 group">
                                <Settings className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                Test your audio and video
                            </button>
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
    options: string[];
}

const DeviceSelect: React.FC<DeviceSelectProps> = ({ label, icon, options }) => {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
                {label}
            </label>
            <div className="relative group">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors">
                    {icon}
                </span>
                <select className="w-full appearance-none bg-[#222730] border border-[#313845] text-gray-200 rounded-xl h-11 pl-11 pr-10 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none cursor-pointer transition-all hover:border-gray-600">
                    {options.map((option, index) => (
                        <option key={index}>{option}</option>
                    ))}
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                    ▼
                </span>
            </div>
        </div>
    );
};
