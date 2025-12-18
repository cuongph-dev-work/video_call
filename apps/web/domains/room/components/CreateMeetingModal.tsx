'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { X, Calendar as CalendarIcon, Clock, Video, Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { generateMeetingCode } from '@video-call/utils';
import { roomApi } from '@/shared/api/room-api';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Calendar } from '@/shared/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/shared/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/components/ui/select';
import { usePreferencesStore } from '@/shared/stores/usePreferencesStore';

interface CreateMeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (config: MeetingConfig) => void;
    username: string;
}

export interface MeetingConfig {
    name: string;
    isInstant: boolean; // true = Now, false = Later
    hostId: string;
    scheduledTime?: Date;
    allowJoinBeforeHost: boolean;
    allowCamera: boolean;
    allowMicrophone: boolean;
    roomId: string;
}

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
    isOpen,
    onClose,
    onCreate,
    username,
}) => {
    const userId = usePreferencesStore(state => state.userId);
    // Form State
    const [meetingName, setMeetingName] = useState(`${username}'s Meeting`);
    const [isInstant, setIsInstant] = useState(true);

    // Date & Time State
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
    const [scheduledTime, setScheduledTime] = useState<string>("09:00");

    const [allowJoinBeforeHost, setAllowJoinBeforeHost] = useState(false);
    // Split permissions
    const [allowCamera, setAllowCamera] = useState(true);
    const [allowMicrophone, setAllowMicrophone] = useState(true);

    if (!isOpen) return null;

    // Generate time options (15 min intervals)
    const timeOptions = [];
    for (let i = 0; i < 24; i++) {
        for (let j = 0; j < 60; j += 15) {
            const hour = i.toString().padStart(2, '0');
            const minute = j.toString().padStart(2, '0');
            timeOptions.push(`${hour}:${minute}`);
        }
    }

    const handleCreate = async () => {
        let finalScheduledTime: Date | undefined;

        if (!isInstant && scheduledDate && scheduledTime) {
            // Combine Date and Time
            const [hours, minutes] = scheduledTime.split(':').map(Number);
            const combined = new Date(scheduledDate);
            combined.setHours(hours);
            combined.setMinutes(minutes);
            combined.setSeconds(0);
            finalScheduledTime = combined;
        }

        const config: MeetingConfig = {
            name: meetingName || `Cuộc họp của ${username}`,
            isInstant,
            hostId: userId,
            scheduledTime: finalScheduledTime,
            allowJoinBeforeHost,
            allowCamera,
            allowMicrophone,
            roomId: '', // Set by API response
        };

        try {
            const response = await roomApi.createRoom(config);
            onCreate({ ...config, roomId: response.roomId });
        } catch (error) {
            console.error("Failed to create room", error);
            // You might want to show a toast here, but onCreate handles success logic usually
            // For now let's persist the error handling upstream or add a toast here.
            // Since the onCreate prop usually handles the navigation/toast, we pass the data up.
            // Wait, if API fails, we shouldn't call onCreate.
            // Let's assume the parent handles the UI feedback, but we need to pass the REAL roomId from API.
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-[#1e2230] border border-[#2e3445] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#2e3445] bg-[#1e2230]">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Video className="w-5 h-5 text-blue-500" />
                        Cài đặt cuộc họp
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#2a3042]"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Meeting Name */}
                    <div className="space-y-2">
                        <Label className="text-gray-300 uppercase tracking-wide text-xs">
                            Tên cuộc họp
                        </Label>
                        <Input
                            type="text"
                            value={meetingName}
                            onChange={(e) => setMeetingName(e.target.value)}
                            placeholder={`Cuộc họp của ${username}`}
                            className="bg-[#161b22] border-[#313845] text-white placeholder-gray-500 focus-visible:ring-blue-500/50"
                        />
                    </div>

                    {/* Time Selection */}
                    <div className="space-y-3">
                        <Label className="text-gray-300 uppercase tracking-wide text-xs">
                            Thời gian
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setIsInstant(true)}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-medium",
                                    isInstant
                                        ? "bg-blue-600/10 border-blue-500 text-blue-400"
                                        : "bg-[#161b22] border-[#313845] text-gray-400 hover:border-gray-500 hover:bg-[#1c222b]"
                                )}
                            >
                                <Video className="w-4 h-4" />
                                Ngay bây giờ
                            </button>
                            <button
                                onClick={() => setIsInstant(false)}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-medium",
                                    !isInstant
                                        ? "bg-blue-600/10 border-blue-500 text-blue-400"
                                        : "bg-[#161b22] border-[#313845] text-gray-400 hover:border-gray-500 hover:bg-[#1c222b]"
                                )}
                            >
                                <CalendarIcon className="w-4 h-4" />
                                Sử dụng sau
                            </button>
                        </div>

                        {/* Date Picker (visible if 'Later' is selected) */}
                        {!isInstant && (
                            <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-200 pt-1">
                                {/* Date Input */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-500">Ngày</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full justify-start text-left font-normal bg-[#161b22] border-[#313845] text-white hover:bg-[#1c222b] hover:text-white",
                                                    !scheduledDate && "text-muted-foreground"
                                                )}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {scheduledDate ? format(scheduledDate, "dd/MM/yyyy", { locale: vi }) : <span>Chọn ngày</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-[#1e2230] border-[#2e3445] text-white" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={scheduledDate}
                                                onSelect={setScheduledDate}
                                                initialFocus
                                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                className="bg-[#1e2230] text-gray-100"
                                                classNames={{
                                                    day_selected: "bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white",
                                                    day_today: "bg-[#2e3445] text-white",
                                                    head_cell: "text-gray-400 w-9 font-normal text-[0.8rem]",
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                {/* Time Input */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-500">Giờ</Label>
                                    <Select value={scheduledTime} onValueChange={setScheduledTime}>
                                        <SelectTrigger className="w-full bg-[#161b22] border-[#313845] text-white">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-gray-400" />
                                                <SelectValue placeholder="Chọn giờ" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1e2230] border-[#2e3445] text-white max-h-[200px]">
                                            {timeOptions.map((time) => (
                                                <SelectItem
                                                    key={time}
                                                    value={time}
                                                    className="focus:bg-[#2a3042] focus:text-white cursor-pointer"
                                                >
                                                    {time}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-[#2e3445]" />

                    {/* Permissions */}
                    <div className="space-y-4">
                        <Label className="text-gray-300 uppercase tracking-wide text-xs">
                            Quyền hạn & Cài đặt
                        </Label>

                        {/* Join Before Host */}
                        <div className="flex items-center justify-between group cursor-pointer p-1 rounded-lg hover:bg-[#2a3042]/50 transition-colors" onClick={() => setAllowJoinBeforeHost(!allowJoinBeforeHost)}>
                            <div>
                                <h4 className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                                    Tham gia trước chủ phòng
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Cho phép người khác vào phòng khi bạn chưa có mặt
                                </p>
                            </div>
                            <div className={cn(
                                "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                allowJoinBeforeHost
                                    ? "bg-blue-500 border-blue-500"
                                    : "border-gray-500 bg-transparent group-hover:border-gray-400"
                            )}>
                                {allowJoinBeforeHost && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                        </div>

                        {/* Allow Microphone */}
                        <div className="flex items-center justify-between group cursor-pointer p-1 rounded-lg hover:bg-[#2a3042]/50 transition-colors" onClick={() => setAllowMicrophone(!allowMicrophone)}>
                            <div>
                                <h4 className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                                    Cho phép mở micro
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Người tham gia có thể bật mic của họ
                                </p>
                            </div>
                            <div className={cn(
                                "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                allowMicrophone
                                    ? "bg-blue-500 border-blue-500"
                                    : "border-gray-500 bg-transparent group-hover:border-gray-400"
                            )}>
                                {allowMicrophone && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                        </div>

                        {/* Allow Camera */}
                        <div className="flex items-center justify-between group cursor-pointer p-1 rounded-lg hover:bg-[#2a3042]/50 transition-colors" onClick={() => setAllowCamera(!allowCamera)}>
                            <div>
                                <h4 className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                                    Cho phép mở camera
                                </h4>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Người tham gia có thể bật camera của họ
                                </p>
                            </div>
                            <div className={cn(
                                "w-5 h-5 rounded border flex items-center justify-center transition-all",
                                allowCamera
                                    ? "bg-blue-500 border-blue-500"
                                    : "border-gray-500 bg-transparent group-hover:border-gray-400"
                            )}>
                                {allowCamera && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#2e3445] bg-[#1e2230]/90 backdrop-blur flex justify-end gap-3 rounded-b-2xl">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white hover:bg-[#2a3042]"
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!isInstant && (!scheduledDate || !scheduledTime)}
                        className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 gap-2"
                    >
                        {isInstant ? (
                            <>
                                <Video className="w-4 h-4" />
                                Tạo cuộc họp ngay
                            </>
                        ) : (
                            <>
                                <CalendarIcon className="w-4 h-4" />
                                Lên lịch cuộc họp
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
