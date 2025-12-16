'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Video, Mic, Volume2, Sparkles, Sliders, ChevronDown, VideoOff } from 'lucide-react';

export const MediaTab: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);

    const [devices, setDevices] = useState<{
        audioInputs: MediaDeviceInfo[];
        videoInputs: MediaDeviceInfo[];
        audioOutputs: MediaDeviceInfo[];
    }>({
        audioInputs: [],
        videoInputs: [],
        audioOutputs: [],
    });

    const [selectedDevices, setSelectedDevices] = useState({
        microphone: '',
        camera: '',
        speaker: '',
    });

    const [settings, setSettings] = useState({
        videoQuality: 'auto',
        noiseCancellation: true,
        echoCancellation: true,
        autoGainControl: true,
        backgroundBlur: false,
        mirrorVideo: true,
    });

    const [audioLevel, setAudioLevel] = useState(0);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);

    // Get available media devices
    useEffect(() => {
        const getDevices = async () => {
            try {
                // Request permissions first
                await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

                const deviceList = await navigator.mediaDevices.enumerateDevices();

                setDevices({
                    audioInputs: deviceList.filter(device => device.kind === 'audioinput'),
                    videoInputs: deviceList.filter(device => device.kind === 'videoinput'),
                    audioOutputs: deviceList.filter(device => device.kind === 'audiooutput'),
                });

                // Set default devices
                const defaultMic = deviceList.find(d => d.kind === 'audioinput' && d.deviceId === 'default');
                const defaultCam = deviceList.find(d => d.kind === 'videoinput');
                const defaultSpeaker = deviceList.find(d => d.kind === 'audiooutput' && d.deviceId === 'default');

                setSelectedDevices({
                    microphone: defaultMic?.deviceId || '',
                    camera: defaultCam?.deviceId || '',
                    speaker: defaultSpeaker?.deviceId || '',
                });
                setIsVideoEnabled(!!defaultCam); // Set video enabled based on whether a camera is found
            } catch (error) {
                console.error('Error getting devices or permissions:', error);
                // If permissions are denied, we might not get any devices, or stream setup will fail.
                // For now, just log the error. Stream setup useEffect will handle specific stream errors.
            }
        };

        getDevices();

        // Listen for device changes
        navigator.mediaDevices.addEventListener('devicechange', getDevices);
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', getDevices);
        };
    }, []);

    // Setup media stream for preview
    useEffect(() => {
        const setupStream = async () => {
            try {
                // Stop existing stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                // Get new stream
                const constraints: MediaStreamConstraints = {
                    audio: selectedDevices.microphone ? { deviceId: { exact: selectedDevices.microphone } } : true,
                    video: selectedDevices.camera && isVideoEnabled ? { deviceId: { exact: selectedDevices.camera } } : false,
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                streamRef.current = stream;

                // Setup video preview
                if (videoRef.current && isVideoEnabled) {
                    videoRef.current.srcObject = stream;
                } else if (videoRef.current) {
                    videoRef.current.srcObject = null; // Clear video if disabled
                }

                // Setup audio analysis
                if (!audioContextRef.current) {
                    audioContextRef.current = new AudioContext();
                }

                const audioContext = audioContextRef.current;
                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                analyserRef.current = analyser;

                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    const source = audioContext.createMediaStreamSource(stream);
                    source.connect(analyser);
                    // Start analyzing audio
                    analyzeAudio();
                } else {
                    setAudioLevel(0); // No audio track, reset level
                    if (animationFrameRef.current) {
                        cancelAnimationFrame(animationFrameRef.current);
                    }
                }

                // Update isVideoEnabled based on whether a video track was successfully obtained
                setIsVideoEnabled(stream.getVideoTracks().length > 0);

            } catch (error) {
                console.error('Error setting up stream:', error);
                setIsVideoEnabled(false); // Disable video if stream setup fails
                setAudioLevel(0); // Reset audio level on error
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                }
            }
        };

        // Only attempt to set up stream if at least one device is selected or available
        if (selectedDevices.microphone || selectedDevices.camera) {
            setupStream();
        } else {
            // If no devices are selected, stop any existing stream and reset states
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            setAudioLevel(0);
            setIsVideoEnabled(false);
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        }


        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(e => console.error("Error closing AudioContext:", e));
                audioContextRef.current = null;
            }
        };
    }, [selectedDevices.microphone, selectedDevices.camera, isVideoEnabled]); // isVideoEnabled is a dependency to react to its own changes

    // Analyze audio levels
    const analyzeAudio = () => {
        if (!analyserRef.current) return;

        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {
            if (!analyserRef.current || !streamRef.current || streamRef.current.getAudioTracks().length === 0) {
                setAudioLevel(0);
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                return;
            }
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            const level = Math.min(100, (average / 255) * 100 * 2); // Scale up for visibility
            setAudioLevel(level);
            animationFrameRef.current = requestAnimationFrame(updateLevel);
        };

        updateLevel();
    };

    return (
        <div className="space-y-6">
            {/* Video Preview */}
            <div className="relative w-full aspect-video bg-[#1A1D24] rounded-lg overflow-hidden border border-[#313845]">
                {isVideoEnabled && selectedDevices.camera ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${settings.mirrorVideo ? 'scale-x-[-1]' : ''}`}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full text-gray-500">
                        <VideoOff className="w-12 h-12 mb-2" />
                        <p className="text-sm">Camera is off or not available</p>
                    </div>
                )}
            </div>

            {/* Audio Level Indicator - Horizontal Pill Design */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Mức âm thanh Microphone
                </h3>

                <div className="flex items-center gap-4 bg-[#1a1d24] rounded-full px-5 py-4 border border-[#313845]">
                    {/* Speaker Icon */}
                    <div className="flex-shrink-0">
                        <Volume2 className={`w-5 h-5 transition-colors ${audioLevel > 5 ? 'text-green-400' : 'text-gray-500'
                            }`} />
                    </div>

                    {/* Horizontal Bars */}
                    <div className="flex items-center gap-1 flex-1">
                        {[...Array(25)].map((_, i) => {
                            const threshold = ((i + 1) / 25) * 100;
                            const isActive = audioLevel >= threshold;

                            // Color logic based on position
                            let barColor;
                            if (i < 15) {
                                // First 15 bars: Green (safe zone - 0-60%)
                                barColor = 'bg-green-500';
                            } else if (i < 20) {
                                // Next 5 bars: Yellow (caution - 60-80%)
                                barColor = 'bg-yellow-500';
                            } else {
                                // Last 5 bars: Red (warning - 80-100% - too loud)
                                barColor = 'bg-red-500';
                            }

                            return (
                                <div
                                    key={i}
                                    className={`h-6 flex-1 rounded transition-all duration-75 ${isActive ? barColor : 'bg-[#2a3042]'
                                        }`}
                                />
                            );
                        })}
                    </div>

                    {/* Percentage Display */}
                    <div className="flex-shrink-0 min-w-[55px] text-right">
                        <span className="text-base font-bold text-gray-300 tabular-nums">
                            {Math.round(audioLevel)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Device Selection Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4" />
                    Thiết bị
                </h3>

                {/* Microphone */}
                <DeviceSelector
                    label="Microphone"
                    icon={<Mic className="w-4 h-4" />}
                    devices={devices.audioInputs}
                    selectedDevice={selectedDevices.microphone}
                    onChange={(deviceId) => setSelectedDevices(prev => ({ ...prev, microphone: deviceId }))}
                />

                {/* Camera */}
                <DeviceSelector
                    label="Camera"
                    icon={<Video className="w-4 h-4" />}
                    devices={devices.videoInputs}
                    selectedDevice={selectedDevices.camera}
                    onChange={(deviceId) => setSelectedDevices(prev => ({ ...prev, camera: deviceId }))}
                />

                {/* Speaker */}
                <DeviceSelector
                    label="Speaker"
                    icon={<Volume2 className="w-4 h-4" />}
                    devices={devices.audioOutputs}
                    selectedDevice={selectedDevices.speaker}
                    onChange={(deviceId) => setSelectedDevices(prev => ({ ...prev, speaker: deviceId }))}
                />
            </div>

            <div className="h-px bg-white/10"></div>

            {/* Video Quality Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Chất lượng Video
                </h3>

                <div className="space-y-3">
                    <label className="text-xs text-gray-400 ml-1">Độ phân giải</label>
                    <div className="grid grid-cols-4 gap-2">
                        {['auto', '360p', '720p', '1080p'].map((quality) => (
                            <button
                                key={quality}
                                onClick={() => setSettings(prev => ({ ...prev, videoQuality: quality }))}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${settings.videoQuality === quality
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : 'bg-[#222730] text-gray-400 hover:bg-[#2a3042] hover:text-white border border-[#313845]'
                                    }`}
                            >
                                {quality === 'auto' ? 'Auto' : quality}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mirror Video */}
                <ToggleOption
                    label="Lật ngược video (Mirror)"
                    description="Hiển thị video của bạn như trong gương"
                    checked={settings.mirrorVideo}
                    onChange={(checked) => setSettings(prev => ({ ...prev, mirrorVideo: checked }))}
                />
            </div>

            <div className="h-px bg-white/10"></div>

            {/* Audio Enhancements */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Cải thiện âm thanh
                </h3>

                <ToggleOption
                    label="Khử tiếng ồn (Noise Cancellation)"
                    description="Loại bỏ tiếng ồn nền khi nói"
                    checked={settings.noiseCancellation}
                    onChange={(checked) => setSettings(prev => ({ ...prev, noiseCancellation: checked }))}
                />

                <ToggleOption
                    label="Khử tiếng vọng (Echo Cancellation)"
                    description="Giảm tiếng vọng từ loa"
                    checked={settings.echoCancellation}
                    onChange={(checked) => setSettings(prev => ({ ...prev, echoCancellation: checked }))}
                />

                <ToggleOption
                    label="Tự động điều chỉnh âm lượng"
                    description="Tự động cân bằng mức âm thanh"
                    checked={settings.autoGainControl}
                    onChange={(checked) => setSettings(prev => ({ ...prev, autoGainControl: checked }))}
                />
            </div>

            <div className="h-px bg-white/10"></div>

            {/* Background Effects */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Hiệu ứng nền
                </h3>

                <ToggleOption
                    label="Làm mờ nền (Background Blur)"
                    description="Làm mờ background phía sau bạn"
                    checked={settings.backgroundBlur}
                    onChange={(checked) => setSettings(prev => ({ ...prev, backgroundBlur: checked }))}
                    badge="Premium"
                />

                <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-blue-400 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-blue-300">Virtual Backgrounds</p>
                            <p className="text-xs text-blue-400/70 mt-1">
                                Nâng cấp lên Premium để sử dụng ảnh nền ảo và nhiều hiệu ứng khác
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Device Selector Component
interface DeviceSelectorProps {
    label: string;
    icon: React.ReactNode;
    devices: MediaDeviceInfo[];
    selectedDevice: string;
    onChange: (deviceId: string) => void;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({
    label,
    icon,
    devices,
    selectedDevice,
    onChange,
}) => {
    return (
        <div className="space-y-2">
            <label className="text-xs text-gray-400 ml-1 flex items-center gap-2">
                {icon}
                {label}
            </label>
            <div className="relative">
                <select
                    value={selectedDevice}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-[#222730] border border-[#313845] text-gray-200 rounded-lg px-4 py-3 pr-10 text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none cursor-pointer transition-all hover:border-gray-600 appearance-none"
                >
                    {devices.length === 0 ? (
                        <option>Không tìm thấy thiết bị</option>
                    ) : (
                        devices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `${label} ${device.deviceId.substring(0, 8)}`}
                            </option>
                        ))
                    )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
        </div>
    );
};

// Toggle Option Component
interface ToggleOptionProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    badge?: string;
}

const ToggleOption: React.FC<ToggleOptionProps> = ({
    label,
    description,
    checked,
    onChange,
    badge,
}) => {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-[#222730] transition-colors group">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-200 cursor-pointer" onClick={() => onChange(!checked)}>
                        {label}
                    </label>
                    {badge && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-blue-600 to-purple-600 text-[10px] font-bold text-white rounded-full uppercase tracking-wide">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-all duration-300 ${checked ? 'bg-blue-600' : 'bg-[#313845]'
                    }`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </button>
        </div>
    );
};
