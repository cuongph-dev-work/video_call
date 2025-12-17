import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface DeviceSelectProps {
    label: string;
    icon: React.ReactNode;
    devices: MediaDeviceInfo[];
    selectedDeviceId: string;
    onDeviceChange: (deviceId: string) => void;
}

export const DeviceSelect: React.FC<DeviceSelectProps> = ({ label, icon, devices, selectedDeviceId, onDeviceChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);
    const selectedLabel = selectedDevice
        ? (selectedDevice.label || `${label} ${selectedDevice.deviceId.slice(0, 8)}`)
        : `Chọn ${label.toLowerCase()}...`;

    return (
        <div className="flex flex-col gap-1.5" ref={dropdownRef}>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">
                {label}
            </label>
            <div className="relative">
                {/* Trigger Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-full flex items-center justify-between bg-[#222730] border text-gray-200 rounded-xl h-11 pl-3.5 pr-3 text-sm transition-all outline-none",
                        isOpen
                            ? "border-blue-500 ring-2 ring-blue-500/20"
                            : "border-[#313845] hover:border-gray-600 hover:bg-[#2a3042]"
                    )}
                    type="button"
                >
                    <div className="flex items-center gap-3 overflow-hidden">
                        <span className={cn("flex-shrink-0 transition-colors", isOpen ? "text-blue-500" : "text-gray-500")}>
                            {icon}
                        </span>
                        <span className="truncate block font-medium">
                            {devices.length === 0 ? `Không tìm thấy ${label.toLowerCase()}` : selectedLabel}
                        </span>
                    </div>
                    <ChevronDown className={cn(
                        "w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0",
                        isOpen && "transform rotate-180 text-blue-500"
                    )} />
                </button>

                {/* Dropdown Menu */}
                {isOpen && devices.length > 0 && (
                    <div className="absolute z-50 w-full mt-1.5 bg-[#1e2229] border border-[#313845] rounded-xl shadow-xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
                        <div className="max-h-[240px] overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                            {devices.map((device) => {
                                const isSelected = device.deviceId === selectedDeviceId;
                                return (
                                    <button
                                        key={device.deviceId}
                                        onClick={() => {
                                            onDeviceChange(device.deviceId);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left transition-colors group",
                                            isSelected
                                                ? "bg-blue-500/10 text-blue-400"
                                                : "text-gray-300 hover:bg-[#2a3042] hover:text-white"
                                        )}
                                    >
                                        <span className="truncate pr-4">
                                            {device.label || `${label} ${device.deviceId.slice(0, 8)}`}
                                        </span>
                                        {isSelected && (
                                            <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
