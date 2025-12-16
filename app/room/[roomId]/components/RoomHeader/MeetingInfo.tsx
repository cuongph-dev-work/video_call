import React from 'react';

interface MeetingInfoProps {
    title: string;
    date: string;
    time: string;
}

export const MeetingInfo: React.FC<MeetingInfoProps> = ({
    title,
    date,
    time,
}) => {
    return (
        <div>
            <h1 className="text-base font-semibold leading-tight text-white">
                {title}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                <span>{date}</span>
                <span className="w-px h-3 bg-gray-600" />
                <span>{time}</span>
            </div>
        </div>
    );
};
