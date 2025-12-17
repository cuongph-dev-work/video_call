import React from 'react';

interface ControlButtonProps {
    icon: React.ReactNode;
    label?: string;
    active?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    onClick?: () => void;
    badge?: boolean | number; // Support both boolean and number
}

export const ControlButton: React.FC<ControlButtonProps> = ({
    icon,
    label,
    active = false,
    variant = 'secondary',
    onClick,
    badge = false,
}) => {
    const getButtonStyles = () => {
        if (variant === 'primary') {
            return 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/30';
        }
        if (variant === 'danger') {
            return 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20';
        }
        return active
            ? 'bg-blue-600 text-white hover:bg-blue-500'
            : 'bg-[#2c303f] text-blue-400 hover:bg-slate-700 border border-white/5';
    };

    const showBadge = typeof badge === 'number' ? badge > 0 : badge;

    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center ${label ? 'h-12 px-8' : 'w-12 h-12'
                } rounded-full transition-all ${getButtonStyles()} relative`}
            aria-label={label}
        >
            {/* Badge display */}
            {showBadge && (
                typeof badge === 'number' ? (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center font-semibold shadow-lg">
                        {badge > 9 ? '9+' : badge}
                    </span>
                ) : (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#13161f]" />
                )
            )}
            {icon}
            {label && <span className="ml-2 font-semibold text-sm">{label}</span>}
        </button>
    );
};
